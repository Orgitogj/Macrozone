import {
  BARCODE_LOG_MESSAGES,
  BarcodeLogError,
  isMatchingReplay,
  type BarcodeLogCommitResult,
  type BarcodeLogRepository,
} from '@/features/barcode/repositories/barcodeLogRepository';
import { findDuplicateId, insertFoodRow, selectFood, updateFoodRow } from '@/features/library/repositories/sqliteFoodRepository';
import type { Food } from '@/features/library/types';
import { isValidFoodInput } from '@/features/library/utils/libraryRecords';
import { rowToMeal, type MealRow } from '@/features/meals/repositories/mealRowMapping';
import { insertMealWithSource, selectMealEntrySource } from '@/features/meals/repositories/sqliteDiaryLogRepository';
import type { ProductMealEntrySource } from '@/features/meals/types';
import { createMeal } from '@/features/meals/utils/mealRecords';
import { parseStoredMealEntrySource } from '@/features/meals/utils/mealEntrySources';
import type { SqlDatabase, SqlExecutor } from '@/storage/database/types';
import { createId } from '@/utils/id';
import { createSerialQueue, type SerialQueue } from '@/utils/serialQueue';

function fail(code: ConstructorParameters<typeof BarcodeLogError>[0]): never {
  throw new BarcodeLogError(code, BARCODE_LOG_MESSAGES[code]);
}

async function linkedFoodId(executor: SqlExecutor, barcode: string): Promise<string | null> {
  const row = await executor.getFirstAsync<{ food_id: string }>('SELECT food_id FROM food_barcodes WHERE barcode = ?', [barcode]);
  return row?.food_id ?? null;
}

async function ensureLink(executor: SqlExecutor, barcode: string, foodId: string, timestamp: string): Promise<void> {
  const current = await linkedFoodId(executor, barcode);
  if (current === foodId) {
    return;
  }
  if (current !== null) {
    fail('barcode_linked_elsewhere');
  }
  await executor.runAsync('INSERT INTO food_barcodes (barcode, food_id, linked_at) VALUES (?, ?, ?)', [barcode, foodId, timestamp]);
}

export function createSqliteBarcodeLogRepository(
  getDatabase: () => Promise<SqlDatabase>,
  { queue = createSerialQueue(), generateId = createId, now = () => new Date() }: { queue?: SerialQueue; generateId?: () => string; now?: () => Date } = {},
): BarcodeLogRepository {
  return {
    commit: (command) =>
      queue.run(async () => {
        const action = command.foodAction;
        if ((action.kind === 'create' || action.kind === 'update_linked') && !isValidFoodInput(action.input)) {
          fail('invalid_data');
        }
        let database: SqlDatabase;
        try {
          database = await getDatabase();
        } catch (error) {
          throw new BarcodeLogError('read_failed', BARCODE_LOG_MESSAGES.read_failed, { cause: error });
        }
        let result: BarcodeLogCommitResult | null = null;
        try {
          await database.withExclusiveTransactionAsync(async (transaction) => {
            const existingRow = await transaction.getFirstAsync<MealRow>(
              'SELECT id, name, calories, protein, carbs, fat, meal_type, local_date, local_time, created_at, updated_at, extra_json FROM meals WHERE id = ?',
              [command.operationId],
            );
            if (existingRow) {
              const existingMeal = rowToMeal(existingRow);
              const existingSource = await selectMealEntrySource(transaction, command.operationId);
              const productSource = existingSource?.sourceType === 'product' ? existingSource : null;
              if (existingMeal === null || !isMatchingReplay(existingMeal, productSource, command)) {
                fail('operation_conflict');
              }
              const food = productSource?.foodId ? await selectFood(transaction, productSource.foodId) : null;
              result = { meal: existingMeal, food, foodOutcome: food ? 'linked' : 'none', replayed: true };
              return;
            }

            const timestamp = now().toISOString();
            let food: Food | null = null;
            let foodOutcome: BarcodeLogCommitResult['foodOutcome'] = 'none';
            switch (action.kind) {
              case 'none':
                break;
              case 'create': {
                const duplicateId = await findDuplicateId(transaction, action.input, null);
                if (duplicateId !== null) {
                  food = await selectFood(transaction, duplicateId);
                  foodOutcome = 'reused_existing';
                } else {
                  food = await insertFoodRow(transaction, generateId(), action.input, timestamp);
                  foodOutcome = 'created';
                }
                if (food === null) {
                  fail('write_failed');
                }
                await ensureLink(transaction, command.source.barcode, food.id, timestamp);
                break;
              }
              case 'keep_linked': {
                food = await selectFood(transaction, action.foodId);
                if (food === null) {
                  fail('linked_food_missing');
                }
                await ensureLink(transaction, command.source.barcode, food.id, timestamp);
                foodOutcome = 'linked';
                break;
              }
              case 'update_linked': {
                const current = await selectFood(transaction, action.foodId);
                if (current === null) {
                  fail('linked_food_missing');
                }
                if ((await findDuplicateId(transaction, action.input, current.id)) !== null) {
                  fail('duplicate_food');
                }
                food = await updateFoodRow(transaction, current, action.input, timestamp);
                await ensureLink(transaction, command.source.barcode, food.id, timestamp);
                foodOutcome = 'updated';
                break;
              }
            }

            const meal = createMeal(command.meal, { id: command.operationId, now: new Date(timestamp) });
            const source = parseStoredMealEntrySource({
              ...command.source,
              foodId: food?.id ?? null,
              logGroupId: null,
              loggedAt: meal.createdAt,
            }) as ProductMealEntrySource | null;
            if (source === null || source.sourceType !== 'product') {
              fail('invalid_data');
            }
            await insertMealWithSource(transaction, meal, source);
            result = { meal, food, foodOutcome, replayed: false };
          });
        } catch (error) {
          if (error instanceof BarcodeLogError) {
            throw error;
          }
          throw new BarcodeLogError('write_failed', BARCODE_LOG_MESSAGES.write_failed, { cause: error });
        }
        if (result === null) {
          fail('write_failed');
        }
        return result;
      }),
  };
}
