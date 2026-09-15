import { LIBRARY_LIMITS, LIBRARY_MESSAGES } from '@/features/library/constants';
import {
  LibraryRepositoryError,
  notFoundError,
  type FoodRepository,
} from '@/features/library/repositories/libraryRepositories';
import {
  createIdGenerator,
  createSqliteAccess,
  placeholders,
  type SqliteLibraryOptions,
} from '@/features/library/repositories/sqliteLibrarySupport';
import type { Food, FoodInput } from '@/features/library/types';
import { isValidFoodInput, parseFoodRecord } from '@/features/library/utils/libraryRecords';
import { buildContainsPattern, toNameKey } from '@/features/library/utils/librarySearch';
import type { SqlDatabase, SqlExecutor, SqlValue } from '@/storage/database/types';
import { createSerialQueue } from '@/utils/serialQueue';

type FoodRow = {
  id: string;
  name: string;
  serving_amount: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  is_favorite: number;
  favorited_at: string | null;
  created_at: string;
  updated_at: string;
};

const FOOD_COLUMNS =
  'id, name, serving_amount, serving_unit, calories, protein, carbs, fat, is_favorite, favorited_at, created_at, updated_at';

function rowToFood(row: FoodRow): Food | null {
  return parseFoodRecord({
    id: row.id,
    name: row.name,
    serving: { amount: row.serving_amount, unit: row.serving_unit },
    nutrition: { calories: row.calories, protein: row.protein, carbs: row.carbs, fat: row.fat },
    isFavorite: row.is_favorite === 1,
    favoritedAt: row.favorited_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function rowsToFoods(rows: readonly FoodRow[]): Food[] {
  return rows.flatMap((row) => {
    const food = rowToFood(row);
    return food ? [food] : [];
  });
}

async function selectFood(executor: SqlExecutor, id: string): Promise<Food | null> {
  const row = await executor.getFirstAsync<FoodRow>(`SELECT ${FOOD_COLUMNS} FROM foods WHERE id = ?`, [id]);
  return row ? rowToFood(row) : null;
}

async function assertNoDuplicate(executor: SqlExecutor, input: FoodInput, exceptId: string | null): Promise<void> {
  const row = await executor.getFirstAsync<{ id: string }>(
    `SELECT id FROM foods
     WHERE name_key = ? AND serving_unit = ? AND serving_amount = ? AND calories = ? AND protein = ? AND carbs = ? AND fat = ?
       AND (? IS NULL OR id <> ?)
     LIMIT 1`,
    [
      toNameKey(input.name),
      input.serving.unit,
      input.serving.amount,
      input.nutrition.calories,
      input.nutrition.protein,
      input.nutrition.carbs,
      input.nutrition.fat,
      exceptId,
      exceptId,
    ],
  );
  if (row) {
    throw new LibraryRepositoryError('duplicate', LIBRARY_MESSAGES.duplicateFood);
  }
}

function assertValidInput(input: FoodInput): void {
  if (!isValidFoodInput(input)) {
    throw new LibraryRepositoryError('invalid_data', LIBRARY_MESSAGES.invalidData);
  }
}

export function createSqliteFoodRepository(
  getDatabase: () => Promise<SqlDatabase>,
  { queue = createSerialQueue(), generateId, now = () => new Date() }: SqliteLibraryOptions = {},
): FoodRepository {
  const { read, write } = createSqliteAccess(getDatabase, queue);
  const newId = createIdGenerator(generateId);

  return {
    listFoods: ({ search, favoritesOnly = false, limit = LIBRARY_LIMITS.listLimit }) =>
      read(async (database) => {
        const pattern = buildContainsPattern(search);
        const params: SqlValue[] = [];
        const conditions: string[] = [];
        if (favoritesOnly) {
          conditions.push('is_favorite = 1');
        }
        if (pattern !== null) {
          conditions.push("name_key LIKE ? ESCAPE '\\'");
          params.push(pattern);
        }
        params.push(limit);
        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        return rowsToFoods(
          await database.getAllAsync<FoodRow>(
            `SELECT ${FOOD_COLUMNS} FROM foods ${where} ORDER BY name_key ASC, id ASC LIMIT ?`,
            params,
          ),
        );
      }),

    getFood: (id) => read((database) => selectFood(database, id)),

    getFoodsByIds: (ids) =>
      read(async (database) => {
        const unique = [...new Set(ids)];
        if (unique.length === 0) {
          return [];
        }
        return rowsToFoods(
          await database.getAllAsync<FoodRow>(
            `SELECT ${FOOD_COLUMNS} FROM foods WHERE id IN (${placeholders(unique.length)})`,
            unique,
          ),
        );
      }),

    createFood: (input) => {
      let id: string;
      try {
        assertValidInput(input);
        id = newId();
      } catch (error) {
        return Promise.reject(error);
      }
      return write(async (database) => {
        const timestamp = now().toISOString();
        await database.withExclusiveTransactionAsync(async (transaction) => {
          await assertNoDuplicate(transaction, input, null);
          await transaction.runAsync(
            `INSERT INTO foods (id, name, name_key, serving_amount, serving_unit, calories, protein, carbs, fat, is_favorite, favorited_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)`,
            [
              id,
              input.name,
              toNameKey(input.name),
              input.serving.amount,
              input.serving.unit,
              input.nutrition.calories,
              input.nutrition.protein,
              input.nutrition.carbs,
              input.nutrition.fat,
              timestamp,
              timestamp,
            ],
          );
        });
        return {
          ...input,
          id,
          isFavorite: false,
          favoritedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      });
    },

    updateFood: (id, input) => {
      try {
        assertValidInput(input);
      } catch (error) {
        return Promise.reject(error);
      }
      return write(async (database) => {
        let updated: Food | null = null;
        await database.withExclusiveTransactionAsync(async (transaction) => {
          const current = await selectFood(transaction, id);
          if (!current) {
            throw notFoundError();
          }
          await assertNoDuplicate(transaction, input, id);
          const timestamp = now().toISOString();
          await transaction.runAsync(
            `UPDATE foods SET name = ?, name_key = ?, serving_amount = ?, serving_unit = ?, calories = ?, protein = ?, carbs = ?, fat = ?, updated_at = ?
             WHERE id = ?`,
            [
              input.name,
              toNameKey(input.name),
              input.serving.amount,
              input.serving.unit,
              input.nutrition.calories,
              input.nutrition.protein,
              input.nutrition.carbs,
              input.nutrition.fat,
              timestamp,
              id,
            ],
          );
          updated = { ...current, ...input, updatedAt: timestamp };
        });
        if (updated === null) {
          throw notFoundError();
        }
        return updated;
      });
    },

    setFavorite: (id, favorite) =>
      write(async (database) => {
        const timestamp = now().toISOString();
        if (favorite) {
          await database.runAsync('UPDATE foods SET is_favorite = 1, favorited_at = COALESCE(favorited_at, ?) WHERE id = ?', [
            timestamp,
            id,
          ]);
        } else {
          await database.runAsync('UPDATE foods SET is_favorite = 0, favorited_at = NULL WHERE id = ?', [id]);
        }
        const food = await selectFood(database, id);
        if (!food) {
          throw notFoundError();
        }
        return food;
      }),

    countReferences: (id) =>
      read(async (database) => {
        const row = await database.getFirstAsync<{ saved_meals: number; recipes: number }>(
          `SELECT
             (SELECT COUNT(DISTINCT saved_meal_id) FROM saved_meal_items WHERE food_id = ?) AS saved_meals,
             (SELECT COUNT(DISTINCT recipe_id) FROM recipe_ingredients WHERE food_id = ?) AS recipes`,
          [id, id],
        );
        return { savedMeals: Number(row?.saved_meals ?? 0), recipes: Number(row?.recipes ?? 0) };
      }),

    deleteFood: (id) =>
      write(async (database) => {
        await database.withExclusiveTransactionAsync(async (transaction) => {
          await transaction.runAsync('UPDATE saved_meal_items SET food_id = NULL WHERE food_id = ?', [id]);
          await transaction.runAsync('UPDATE recipe_ingredients SET food_id = NULL WHERE food_id = ?', [id]);
          await transaction.runAsync('UPDATE meal_entry_sources SET food_id = NULL WHERE food_id = ?', [id]);
          await transaction.runAsync('DELETE FROM foods WHERE id = ?', [id]);
        });
      }),
  };
}
