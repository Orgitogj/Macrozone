import { LIBRARY_MESSAGES } from '@/features/library/constants';
import {
  LibraryRepositoryError,
  toLibraryRepositoryError,
} from '@/features/library/repositories/libraryRepositories';
import type { FoodPortion, FoodPortionInput } from '@/features/library/types';
import { parsePortionRecord } from '@/features/library/utils/libraryRecords';
import type { SqlDatabase, SqlExecutor } from '@/storage/database/types';
import { createId } from '@/utils/id';
import type { SerialQueue } from '@/utils/serialQueue';

export type SqliteLibraryOptions = {
  queue?: SerialQueue;
  generateId?: () => string;
  now?: () => Date;
};

export type PortionTable = {
  table: 'saved_meal_items' | 'recipe_ingredients';
  parentColumn: 'saved_meal_id' | 'recipe_id';
};

export const SAVED_MEAL_ITEMS_TABLE: PortionTable = { table: 'saved_meal_items', parentColumn: 'saved_meal_id' };

type PortionRow = {
  id: string;
  parent_id: string;
  food_id: string | null;
  food_name: string;
  serving_amount: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  amount: number;
};

export function createIdGenerator(generateId: () => string = createId) {
  return (): string => {
    try {
      return generateId();
    } catch (error) {
      throw new LibraryRepositoryError('id_generation_failed', LIBRARY_MESSAGES.idGenerationFailed, { cause: error });
    }
  };
}

export function createSqliteAccess(getDatabase: () => Promise<SqlDatabase>, queue: SerialQueue) {
  return {
    read: async <T>(task: (database: SqlDatabase) => Promise<T>): Promise<T> => {
      try {
        return await task(await getDatabase());
      } catch (error) {
        throw toLibraryRepositoryError(error, 'read_failed', LIBRARY_MESSAGES.readFailed);
      }
    },
    write: <T>(task: (database: SqlDatabase) => Promise<T>): Promise<T> =>
      queue.run(async () => {
        try {
          return await task(await getDatabase());
        } catch (error) {
          throw toLibraryRepositoryError(error, 'write_failed', LIBRARY_MESSAGES.writeFailed);
        }
      }),
  };
}

export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

export async function insertPortions(
  executor: SqlExecutor,
  { table, parentColumn }: PortionTable,
  parentId: string,
  portions: readonly FoodPortionInput[],
  newId: () => string,
): Promise<FoodPortion[]> {
  const inserted: FoodPortion[] = [];
  for (const [position, portion] of portions.entries()) {
    const id = newId();
    await executor.runAsync(
      `INSERT INTO ${table} (id, ${parentColumn}, position, food_id, food_name, serving_amount, serving_unit, calories, protein, carbs, fat, amount)
       VALUES (?, ?, ?, (SELECT id FROM foods WHERE id = ?), ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        parentId,
        position,
        portion.foodId,
        portion.foodName,
        portion.serving.amount,
        portion.serving.unit,
        portion.nutrition.calories,
        portion.nutrition.protein,
        portion.nutrition.carbs,
        portion.nutrition.fat,
        portion.amount,
      ],
    );
    inserted.push({ ...portion, id });
  }
  return inserted;
}

export async function loadPortions(
  executor: SqlExecutor,
  { table, parentColumn }: PortionTable,
  parentIds: readonly string[],
): Promise<Map<string, FoodPortion[]>> {
  const result = new Map<string, FoodPortion[]>();
  if (parentIds.length === 0) {
    return result;
  }
  const rows = await executor.getAllAsync<PortionRow>(
    `SELECT id, ${parentColumn} AS parent_id, food_id, food_name, serving_amount, serving_unit, calories, protein, carbs, fat, amount
     FROM ${table} WHERE ${parentColumn} IN (${placeholders(parentIds.length)})
     ORDER BY ${parentColumn}, position`,
    [...parentIds],
  );
  for (const row of rows) {
    const portion = parsePortionRecord({
      id: row.id,
      foodId: row.food_id,
      foodName: row.food_name,
      serving: { amount: row.serving_amount, unit: row.serving_unit },
      nutrition: { calories: row.calories, protein: row.protein, carbs: row.carbs, fat: row.fat },
      amount: row.amount,
    });
    if (portion) {
      result.set(row.parent_id, [...(result.get(row.parent_id) ?? []), portion]);
    }
  }
  return result;
}
