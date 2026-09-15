import type { DiaryLogRepository } from '@/features/meals/repositories/diaryLogRepository';
import {
  MEAL_REPOSITORY_MESSAGES,
  MealRepositoryError,
  toMealRepositoryError,
} from '@/features/meals/repositories/mealRepository';
import { INSERT_MEAL_SQL, mealToRowValues, rowToMeal, type MealRow } from '@/features/meals/repositories/mealRowMapping';
import type { Meal, MealEntrySource, NewDiaryEntry, RecentFoodUsage } from '@/features/meals/types';
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

const SOURCE_COLUMNS =
  'meal_id, source_type, food_id, recipe_id, saved_meal_id, log_group_id, source_name, serving_amount, serving_unit, base_calories, base_protein, base_carbs, base_fat, amount, logged_at';

const INSERT_SOURCE_SQL = `INSERT INTO meal_entry_sources (${SOURCE_COLUMNS}) VALUES (
  ?, ?,
  (SELECT id FROM foods WHERE id = ?),
  (SELECT id FROM recipes WHERE id = ?),
  (SELECT id FROM saved_meals WHERE id = ?),
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
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

function sourceValues(mealId: string, source: MealEntrySource): SqlValue[] {
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

  const insertEntry = async (
    transaction: SqlExecutor,
    meal: Meal,
    source: MealEntrySource | null,
  ): Promise<void> => {
    await transaction.runAsync(INSERT_MEAL_SQL, mealToRowValues(meal, null));
    if (source) {
      await transaction.runAsync(INSERT_SOURCE_SQL, sourceValues(meal.id, source));
    }
  };

  return {
    logEntries: (entries: readonly NewDiaryEntry[], { group }) => {
      if (entries.length === 0) {
        return Promise.resolve([]);
      }
      let ids: string[];
      let groupId: string | null;
      try {
        ids = entries.map(() => newId());
        groupId = group ? newId() : null;
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
            await insertEntry(transaction, meal, {
              ...entry.source,
              logGroupId: groupId,
              loggedAt: meal.createdAt,
            });
            meals.push(meal);
          }
        });
        return meals;
      });
    },

    getEntrySource: (mealId: string) =>
      read(async (database) => {
        const row = await database.getFirstAsync<SourceRow>(
          `SELECT ${SOURCE_COLUMNS} FROM meal_entry_sources WHERE meal_id = ?`,
          [mealId],
        );
        return row ? rowToMealEntrySource(row) : null;
      }),

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
          const rows = await transaction.getAllAsync<MealRow & { source_meal_id: string | null } & Partial<SourceRow>>(
            `SELECT m.id, m.name, m.calories, m.protein, m.carbs, m.fat, m.meal_type, m.local_date, m.local_time, m.created_at, m.updated_at, m.extra_json,
               s.meal_id AS source_meal_id, s.source_type, s.food_id, s.recipe_id, s.saved_meal_id, s.log_group_id, s.source_name,
               s.serving_amount, s.serving_unit, s.base_calories, s.base_protein, s.base_carbs, s.base_fat, s.amount, s.logged_at
             FROM meals m
             LEFT JOIN meal_entry_sources s ON s.meal_id = m.id
             WHERE m.local_date = ? AND (? IS NULL OR m.meal_type = ?)
             ORDER BY m.created_at DESC, m.id DESC`,
            [sourceDate, mealType, mealType],
          );
          const base = now().getTime();
          const groupIds = new Map<string, string>();
          for (const [index, row] of rows.entries()) {
            const original = rowToMeal(row);
            if (!original) {
              continue;
            }
            const createdAt = new Date(base + (rows.length - 1 - index));
            const meal = createMeal({ ...original, date: destinationDate }, { id: newId(), now: createdAt });
            const source =
              row.source_meal_id !== null && row.source_type !== undefined
                ? rowToMealEntrySource(row as SourceRow)
                : null;
            let copiedSource: MealEntrySource | null = null;
            if (source) {
              let groupId: string | null = null;
              if (source.logGroupId) {
                groupId = groupIds.get(source.logGroupId) ?? newId();
                groupIds.set(source.logGroupId, groupId);
              }
              copiedSource = { ...source, logGroupId: groupId, loggedAt: meal.createdAt };
            }
            await insertEntry(transaction, meal, copiedSource);
            created.push(meal);
          }
        });
        return created;
      }),
  };
}
