import { LIBRARY_LIMITS, LIBRARY_MESSAGES } from '@/features/library/constants';
import {
  LibraryRepositoryError,
  notFoundError,
  type SavedMealRepository,
} from '@/features/library/repositories/libraryRepositories';
import {
  createIdGenerator,
  createSqliteAccess,
  insertPortions,
  loadPortions,
  SAVED_MEAL_ITEMS_TABLE,
  type SqliteLibraryOptions,
} from '@/features/library/repositories/sqliteLibrarySupport';
import type { FoodPortionInput, SavedMeal } from '@/features/library/types';
import {
  isValidSavedMealInput,
  parseSavedMealRecord,
} from '@/features/library/utils/libraryRecords';
import { buildContainsPattern, normalizeLibraryName, toNameKey } from '@/features/library/utils/librarySearch';
import type { SqlDatabase, SqlExecutor, SqlValue } from '@/storage/database/types';
import { createSerialQueue } from '@/utils/serialQueue';

type SavedMealRow = { id: string; name: string; created_at: string; updated_at: string };

function invalidData(): LibraryRepositoryError {
  return new LibraryRepositoryError('invalid_data', LIBRARY_MESSAGES.invalidData);
}

function listSql(table: 'saved_meals' | 'recipes', columns: string, search: string | undefined, limit: number) {
  const pattern = buildContainsPattern(search);
  const params: SqlValue[] = [];
  let where = '';
  if (pattern !== null) {
    where = "WHERE name_key LIKE ? ESCAPE '\\'";
    params.push(pattern);
  }
  params.push(limit);
  return { sql: `SELECT ${columns} FROM ${table} ${where} ORDER BY name_key ASC, id ASC LIMIT ?`, params };
}

async function loadSavedMeals(executor: SqlExecutor, rows: readonly SavedMealRow[]): Promise<SavedMeal[]> {
  const items = await loadPortions(executor, SAVED_MEAL_ITEMS_TABLE, rows.map((row) => row.id));
  return rows.flatMap((row) => {
    const savedMeal = parseSavedMealRecord({
      id: row.id,
      name: row.name,
      items: items.get(row.id) ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
    return savedMeal ? [savedMeal] : [];
  });
}

export function createSqliteSavedMealRepository(
  getDatabase: () => Promise<SqlDatabase>,
  { queue = createSerialQueue(), generateId, now = () => new Date() }: SqliteLibraryOptions = {},
): SavedMealRepository {
  const { read, write } = createSqliteAccess(getDatabase, queue);
  const newId = createIdGenerator(generateId);
  const columns = 'id, name, created_at, updated_at';

  const selectOne = async (executor: SqlExecutor, id: string): Promise<SavedMeal | null> => {
    const row = await executor.getFirstAsync<SavedMealRow>(`SELECT ${columns} FROM saved_meals WHERE id = ?`, [id]);
    return row ? ((await loadSavedMeals(executor, [row]))[0] ?? null) : null;
  };

  const insertNew = async (executor: SqlExecutor, name: string, items: readonly FoodPortionInput[], timestamp: string): Promise<SavedMeal> => {
    const id = newId();
    await executor.runAsync(
      'INSERT INTO saved_meals (id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, name, toNameKey(name), timestamp, timestamp],
    );
    const inserted = await insertPortions(executor, SAVED_MEAL_ITEMS_TABLE, id, items, newId);
    return { id, name, items: inserted, createdAt: timestamp, updatedAt: timestamp };
  };

  return {
    listSavedMeals: ({ search, limit = LIBRARY_LIMITS.listLimit }) =>
      read(async (database) => {
        const { sql, params } = listSql('saved_meals', columns, search, limit);
        return loadSavedMeals(database, await database.getAllAsync<SavedMealRow>(sql, params));
      }),

    getSavedMeal: (id) => read((database) => selectOne(database, id)),

    createSavedMeal: (input) => {
      if (!isValidSavedMealInput(input)) {
        return Promise.reject(invalidData());
      }
      return write(async (database) => {
        let created: SavedMeal | null = null;
        await database.withExclusiveTransactionAsync(async (transaction) => {
          created = await insertNew(
            transaction,
            input.name,
            input.items,
            now().toISOString(),
          );
        });
        if (created === null) {
          throw invalidData();
        }
        return created;
      });
    },

    updateSavedMeal: (id, input) => {
      if (!isValidSavedMealInput(input)) {
        return Promise.reject(invalidData());
      }
      return write(async (database) => {
        let updated: SavedMeal | null = null;
        await database.withExclusiveTransactionAsync(async (transaction) => {
          const current = await selectOne(transaction, id);
          if (!current) {
            throw notFoundError();
          }
          const timestamp = now().toISOString();
          await transaction.runAsync('UPDATE saved_meals SET name = ?, name_key = ?, updated_at = ? WHERE id = ?', [
            input.name,
            toNameKey(input.name),
            timestamp,
            id,
          ]);
          await transaction.runAsync('DELETE FROM saved_meal_items WHERE saved_meal_id = ?', [id]);
          const items = await insertPortions(transaction, SAVED_MEAL_ITEMS_TABLE, id, input.items, newId);
          updated = { ...current, name: input.name, items, updatedAt: timestamp };
        });
        if (updated === null) {
          throw notFoundError();
        }
        return updated;
      });
    },

    duplicateSavedMeal: (id, name) =>
      write(async (database) => {
        let created: SavedMeal | null = null;
        await database.withExclusiveTransactionAsync(async (transaction) => {
          const source = await selectOne(transaction, id);
          if (!source) {
            throw notFoundError();
          }
          created = await insertNew(transaction, normalizeLibraryName(name), source.items, now().toISOString());
        });
        if (created === null) {
          throw notFoundError();
        }
        return created;
      }),

    deleteSavedMeal: (id) =>
      write(async (database) => {
        await database.withExclusiveTransactionAsync(async (transaction) => {
          await transaction.runAsync('UPDATE meal_entry_sources SET saved_meal_id = NULL WHERE saved_meal_id = ?', [id]);
          await transaction.runAsync('DELETE FROM saved_meal_items WHERE saved_meal_id = ?', [id]);
          await transaction.runAsync('DELETE FROM saved_meals WHERE id = ?', [id]);
        });
      }),
  };
}
