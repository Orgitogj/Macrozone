import {
  MEAL_REPOSITORY_MESSAGES,
  MealRepositoryError,
  toMealRepositoryError,
  type MealRepository,
} from '@/features/meals/repositories/mealRepository';
import {
  INSERT_MEAL_SQL,
  MEAL_COLUMNS,
  mealToRowValues,
  rowToMeal,
  type MealRow,
} from '@/features/meals/repositories/mealRowMapping';
import type { Meal, MealInput } from '@/features/meals/types';
import { doesUpdateDetachSource } from '@/features/meals/utils/mealEntrySources';
import { applyMealUpdate, createMeal } from '@/features/meals/utils/mealRecords';
import type { SqlDatabase } from '@/storage/database/types';
import type { LocalDateKey } from '@/utils/date';
import { createId } from '@/utils/id';
import { createSerialQueue, type SerialQueue } from '@/utils/serialQueue';

type SqliteMealRepositoryOptions = {
  queue?: SerialQueue;
  generateId?: () => string;
  now?: () => Date;
};

function rowsToMeals(rows: readonly MealRow[]): Meal[] {
  return rows.flatMap((row) => {
    const meal = rowToMeal(row);
    return meal ? [meal] : [];
  });
}

export function createSqliteMealRepository(
  getDatabase: () => Promise<SqlDatabase>,
  {
    queue = createSerialQueue(),
    generateId = createId,
    now = () => new Date(),
  }: SqliteMealRepositoryOptions = {},
): MealRepository {
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

  return {
    listMeals: () =>
      read(async (database) =>
        rowsToMeals(
          await database.getAllAsync<MealRow>(
            `SELECT ${MEAL_COLUMNS} FROM meals ORDER BY local_date DESC, created_at DESC`,
            [],
          ),
        ),
      ),

    countMeals: () =>
      read(async (database) => {
        const row = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM meals', []);
        return Number(row?.count ?? 0);
      }),

    getMealById: (id: string) =>
      read(async (database) => {
        const row = await database.getFirstAsync<MealRow>(
          `SELECT ${MEAL_COLUMNS} FROM meals WHERE id = ?`,
          [id],
        );
        return row ? rowToMeal(row) : null;
      }),

    createMeal: (input: MealInput) => {
      let id: string;
      try {
        id = generateId();
      } catch (error) {
        return Promise.reject(
          new MealRepositoryError('id_generation_failed', MEAL_REPOSITORY_MESSAGES.idGenerationFailed, {
            cause: error,
          }),
        );
      }
      return write(async (database) => {
        const meal = createMeal(input, { id, now: now() });
        await database.runAsync(INSERT_MEAL_SQL, mealToRowValues(meal, null));
        return meal;
      });
    },

    updateMeal: (id: string, input: MealInput) =>
      write(async (database) => {
        let updated: Meal | null = null;
        await database.withExclusiveTransactionAsync(async (transaction) => {
          const row = await transaction.getFirstAsync<MealRow>(
            `SELECT ${MEAL_COLUMNS} FROM meals WHERE id = ?`,
            [id],
          );
          const current = row ? rowToMeal(row) : null;
          if (current === null) {
            throw new MealRepositoryError('not_found', MEAL_REPOSITORY_MESSAGES.notFound);
          }
          const next = applyMealUpdate(current, input, now());
          if (doesUpdateDetachSource(current, input)) {
            await transaction.runAsync('DELETE FROM meal_entry_sources WHERE meal_id = ?', [id]);
          }
          await transaction.runAsync(
            `UPDATE meals SET name = ?, calories = ?, protein = ?, carbs = ?, fat = ?, meal_type = ?, local_date = ?, local_time = ?, updated_at = ? WHERE id = ?`,
            [
              next.name,
              next.calories,
              next.protein,
              next.carbs,
              next.fat,
              next.mealType,
              next.date,
              next.time,
              next.updatedAt,
              id,
            ],
          );
          updated = next;
        });
        if (updated === null) {
          throw new MealRepositoryError('not_found', MEAL_REPOSITORY_MESSAGES.notFound);
        }
        return updated;
      }),

    deleteMeal: (id: string) =>
      write(async (database) => {
        await database.withExclusiveTransactionAsync(async (transaction) => {
          await transaction.runAsync('DELETE FROM meal_entry_sources WHERE meal_id = ?', [id]);
          await transaction.runAsync('DELETE FROM meals WHERE id = ?', [id]);
        });
      }),

    deleteMealsForDate: (date: LocalDateKey) =>
      write(async (database) => {
        let deleted = 0;
        await database.withExclusiveTransactionAsync(async (transaction) => {
          await transaction.runAsync(
            'DELETE FROM meal_entry_sources WHERE meal_id IN (SELECT id FROM meals WHERE local_date = ?)',
            [date],
          );
          deleted = (await transaction.runAsync('DELETE FROM meals WHERE local_date = ?', [date])).changes;
        });
        return deleted;
      }),

    deleteAllMeals: () =>
      write(async (database) => {
        let deleted = 0;
        await database.withExclusiveTransactionAsync(async (transaction) => {
          await transaction.runAsync('DELETE FROM meal_entry_sources', []);
          deleted = (await transaction.runAsync('DELETE FROM meals', [])).changes;
        });
        return deleted;
      }),
  };
}
