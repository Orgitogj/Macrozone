import type { DiaryLogRepository } from '@/features/meals/repositories/diaryLogRepository';
import {
  MEAL_REPOSITORY_MESSAGES,
  MealRepositoryError,
  toMealRepositoryError,
} from '@/features/meals/repositories/mealRepository';
import { INSERT_MEAL_SQL, mealToRowValues, rowToMeal, type MealRow } from '@/features/meals/repositories/mealRowMapping';
import type {
  AiMealEntrySource,
  LibraryMealEntrySource,
  Meal,
  MealEntrySource,
  NewDiaryEntry,
  RecentFoodUsage,
} from '@/features/meals/types';
import { createMeal } from '@/features/meals/utils/mealRecords';
import { parseStoredMealEntrySource } from '@/features/meals/utils/mealEntrySources';
import { isServingUnit } from '@/features/library/utils/servingFormat';
import type { SqlDatabase, SqlExecutor, SqlValue } from '@/storage/database/types';
import { createId } from '@/utils/id';
import { createSerialQueue, type SerialQueue } from '@/utils/serialQueue';

type SourceRow = {
  meal_id: string;
  source_type: string;
  food_id: string | null;
  recipe_id: string | null;
  saved_meal_id: string | null;
  log_group_id: string | null;
  source_name: string;
  serving_amount: number;
  serving_unit: string;
  base_calories: number;
  base_protein: number;
  base_carbs: number;
  base_fat: number;
  amount: number;
  logged_at: string;
};

type AiSourceRow = {
  meal_id: string;
  input_kind: string;
  meal_title: string;
  item_name: string;
  amount: number;
  unit: string;
  matched_food_id: string | null;
  log_group_id: string;
  logged_at: string;
};

const SOURCE_COLUMNS =
  'meal_id, source_type, food_id, recipe_id, saved_meal_id, log_group_id, source_name, serving_amount, serving_unit, base_calories, base_protein, base_carbs, base_fat, amount, logged_at';

const AI_SOURCE_COLUMNS = 'meal_id, input_kind, meal_title, item_name, amount, unit, matched_food_id, log_group_id, logged_at';

const INSERT_SOURCE_SQL = `INSERT INTO meal_entry_sources (${SOURCE_COLUMNS}) VALUES (
  ?, ?,
  (SELECT id FROM foods WHERE id = ?),
  (SELECT id FROM recipes WHERE id = ?),
  (SELECT id FROM saved_meals WHERE id = ?),
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
)`;

const INSERT_AI_SOURCE_SQL = `INSERT INTO meal_entry_ai_sources (${AI_SOURCE_COLUMNS}) VALUES (
  ?, ?, ?, ?, ?, ?,
  (SELECT id FROM foods WHERE id = ?),
  ?, ?
)`;

export function rowToMealEntrySource(row: SourceRow): MealEntrySource | null {
  return parseStoredMealEntrySource({
    sourceType: row.source_type,
    foodId: row.food_id,
    recipeId: row.recipe_id,
    savedMealId: row.saved_meal_id,
    logGroupId: row.log_group_id,
    sourceName: row.source_name,
    serving: { amount: row.serving_amount, unit: row.serving_unit },
    baseNutrition: {
      calories: row.base_calories,
      protein: row.base_protein,
      carbs: row.base_carbs,
      fat: row.base_fat,
    },
    amount: row.amount,
    loggedAt: row.logged_at,
  });
}

export function rowToAiEntrySource(row: AiSourceRow): MealEntrySource | null {
  return parseStoredMealEntrySource({
    sourceType: 'ai',
    inputKind: row.input_kind,
    mealTitle: row.meal_title,
    itemName: row.item_name,
    amount: row.amount,
    unit: row.unit,
    matchedFoodId: row.matched_food_id,
    logGroupId: row.log_group_id,
    loggedAt: row.logged_at,
  });
}

function librarySourceValues(mealId: string, source: LibraryMealEntrySource): SqlValue[] {
  return [
    mealId,
    source.sourceType,
    source.foodId,
    source.recipeId,
    source.savedMealId,
    source.logGroupId,
    source.sourceName,
    source.serving.amount,
    source.serving.unit,
    source.baseNutrition.calories,
    source.baseNutrition.protein,
    source.baseNutrition.carbs,
    source.baseNutrition.fat,
    source.amount,
    source.loggedAt,
  ];
}

function aiSourceValues(mealId: string, source: AiMealEntrySource, groupId: string): SqlValue[] {
  return [
    mealId,
    source.inputKind,
    source.mealTitle,
    source.itemName,
    source.amount,
    source.unit,
    source.matchedFoodId,
    source.logGroupId ?? groupId,
    source.loggedAt,
  ];
}

export async function insertMealWithSource(transaction: SqlExecutor, meal: Meal, source: MealEntrySource | null): Promise<void> {
  await transaction.runAsync(INSERT_MEAL_SQL, mealToRowValues(meal, null));
  if (source === null) {
    return;
  }
  switch (source.sourceType) {
    case 'ai':
      await transaction.runAsync(INSERT_AI_SOURCE_SQL, aiSourceValues(meal.id, source, meal.id));
      break;
    default:
      await transaction.runAsync(INSERT_SOURCE_SQL, librarySourceValues(meal.id, source));
  }
}

export async function selectMealEntrySource(executor: SqlExecutor, mealId: string): Promise<MealEntrySource | null> {
  const row = await executor.getFirstAsync<SourceRow>(`SELECT ${SOURCE_COLUMNS} FROM meal_entry_sources WHERE meal_id = ?`, [mealId]);
  if (row) {
    return rowToMealEntrySource(row);
  }
  const aiRow = await executor.getFirstAsync<AiSourceRow>(`SELECT ${AI_SOURCE_COLUMNS} FROM meal_entry_ai_sources WHERE meal_id = ?`, [mealId]);
  return aiRow ? rowToAiEntrySource(aiRow) : null;
}

type Options = {
  queue?: SerialQueue;
  generateId?: () => string;
  now?: () => Date;
};

export function createSqliteDiaryLogRepository(
  getDatabase: () => Promise<SqlDatabase>,
  { queue = createSerialQueue(), generateId = createId, now = () => new Date() }: Options = {},
): DiaryLogRepository {
  const newId = (): string => {
    try {
      return generateId();
    } catch (error) {
      throw new MealRepositoryError('id_generation_failed', MEAL_REPOSITORY_MESSAGES.idGenerationFailed, { cause: error });
    }
  };

  const read = async <T>(task: (database: SqlDatabase) => Promise<T>): Promise<T> => {
    const database = await getDatabase();
    try {
      return await task(database);
    } catch (error) {
      throw toMealRepositoryError(error, 'read_failed', MEAL_REPOSITORY_MESSAGES.readFailed);
    }
  };

  const write = <T>(task: (database: SqlDatabase) => Promise<T>): Promise<T> =>
    queue.run(async () => {
      const database = await getDatabase();
      try {
        return await task(database);
      } catch (error) {
        throw toMealRepositoryError(error, 'write_failed', MEAL_REPOSITORY_MESSAGES.writeFailed);
      }
    });

  const insertEntry = insertMealWithSource;

  const selectSource = selectMealEntrySource;

  return {
    logEntries: (entries: readonly NewDiaryEntry[], { group }) => {
      if (entries.length === 0) {
        return Promise.resolve([]);
      }
      let ids: string[];
      let groupId: string | null;
      try {
        ids = entries.map(() => newId());
        groupId = group || entries.some((entry) => entry.source.sourceType === 'ai') ? newId() : null;
      } catch (error) {
        return Promise.reject(error);
      }
      return write(async (database) => {
        const base = now().getTime();
        const meals: Meal[] = [];
        await database.withExclusiveTransactionAsync(async (transaction) => {
          for (const [index, entry] of entries.entries()) {
            const createdAt = new Date(base + (entries.length - 1 - index));
            const meal = createMeal(entry.input, { id: ids[index], now: createdAt });
            await insertEntry(transaction, meal, { ...entry.source, logGroupId: groupId, loggedAt: meal.createdAt });
            meals.push(meal);
          }
        });
        return meals;
      });
    },

    getEntrySource: (mealId: string) => read((database) => selectSource(database, mealId)),

    listRecentFoodUsage: (limit: number) =>
      read(async (database) => {
        const rows = await database.getAllAsync<{
          food_id: string;
          last_logged_at: string;
          last_amount: number;
          last_serving_unit: string;
        }>(
          `SELECT recent.food_id AS food_id, recent.last_logged_at AS last_logged_at,
             latest.amount AS last_amount, latest.serving_unit AS last_serving_unit
           FROM (
             SELECT s.food_id AS food_id, MAX(s.logged_at) AS last_logged_at
             FROM meal_entry_sources s
             JOIN meals m ON m.id = s.meal_id
             WHERE s.food_id IS NOT NULL
             GROUP BY s.food_id
           ) recent
           JOIN meal_entry_sources latest ON latest.meal_id = (
             SELECT s2.meal_id FROM meal_entry_sources s2
             WHERE s2.food_id = recent.food_id AND s2.logged_at = recent.last_logged_at
             ORDER BY s2.meal_id LIMIT 1
           )
           ORDER BY recent.last_logged_at DESC, recent.food_id ASC
           LIMIT ?`,
          [limit],
        );
        return rows.flatMap((row): RecentFoodUsage[] =>
          typeof row.food_id === 'string' &&
          isServingUnit(row.last_serving_unit) &&
          typeof row.last_amount === 'number' &&
          row.last_amount > 0 &&
          typeof row.last_logged_at === 'string'
            ? [
                {
                  foodId: row.food_id,
                  lastLoggedAt: row.last_logged_at,
                  lastAmount: row.last_amount,
                  lastServingUnit: row.last_serving_unit,
                },
              ]
            : [],
        );
      }),

    copyEntries: ({ sourceDate, destinationDate, mealType }) =>
      write(async (database) => {
        const created: Meal[] = [];
        await database.withExclusiveTransactionAsync(async (transaction) => {
          const rows = await transaction.getAllAsync<MealRow>(
            `SELECT id, name, calories, protein, carbs, fat, meal_type, local_date, local_time, created_at, updated_at, extra_json
             FROM meals
             WHERE local_date = ? AND (? IS NULL OR meal_type = ?)
             ORDER BY created_at DESC, id DESC`,
            [sourceDate, mealType, mealType],
          );
          const base = now().getTime();
          const groupIds = new Map<string, string>();
          const remapGroup = (groupId: string | null): string | null => {
            if (groupId === null) {
              return null;
            }
            const mapped = groupIds.get(groupId) ?? newId();
            groupIds.set(groupId, mapped);
            return mapped;
          };
          for (const [index, row] of rows.entries()) {
            const original = rowToMeal(row);
            if (!original) {
              continue;
            }
            const createdAt = new Date(base + (rows.length - 1 - index));
            const meal = createMeal({ ...original, date: destinationDate }, { id: newId(), now: createdAt });
            const source = await selectSource(transaction, original.id);
            const copiedSource: MealEntrySource | null = source
              ? { ...source, logGroupId: remapGroup(source.logGroupId), loggedAt: meal.createdAt }
              : null;
            await insertEntry(transaction, meal, copiedSource);
            created.push(meal);
          }
        });
        return created;
      }),
  };
}
