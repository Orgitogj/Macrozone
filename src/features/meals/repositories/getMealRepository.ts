import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  importLegacyMeals,
  LEGACY_MEALS_STORAGE_KEY,
} from '@/features/meals/repositories/legacyMealImport';
import {
  MEAL_REPOSITORY_MESSAGES,
  MealRepositoryError,
  type MealRepository,
} from '@/features/meals/repositories/mealRepository';
import { createSqliteMealRepository } from '@/features/meals/repositories/sqliteMealRepository';
import { getAccountDatabaseManager } from '@/features/account/repositories/getAccountDatabaseManager';
import { scopeKey } from '@/features/account/types';
import { getDatabase } from '@/storage/database/openDatabase';
import type { SqlDatabase } from '@/storage/database/types';
import { localDataWriteQueue } from '@/storage/database/writeQueue';

export function createReadyDatabaseLoader(
  openDatabase: () => Promise<SqlDatabase>,
  readLegacyValue: () => Promise<string | null>,
  scopeKeyOf: () => string = () => 'guest',
): () => Promise<SqlDatabase> {
  const pending = new Map<string, Promise<SqlDatabase>>();
  return () => {
    const key = scopeKeyOf();
    const existing = pending.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const started = (async () => {
      try {
        const database = await openDatabase();
        if (key === 'guest') {
          await importLegacyMeals(database, { readLegacyValue });
        }
        return database;
      } catch (error) {
        if (__DEV__) {
          console.warn('[meals] Failed to prepare the meal database', error);
        }
        throw new MealRepositoryError('migration_failed', MEAL_REPOSITORY_MESSAGES.migrationFailed, {
          cause: error,
        });
      }
    })();
    pending.set(key, started);
    started.catch(() => {
      pending.delete(key);
    });
    return started;
  };
}

export const loadReadyMealDatabase = createReadyDatabaseLoader(
  getDatabase,
  () => AsyncStorage.getItem(LEGACY_MEALS_STORAGE_KEY),
  () => scopeKey(getAccountDatabaseManager().getActiveScope()),
);

const repository = createSqliteMealRepository(loadReadyMealDatabase, { queue: localDataWriteQueue });

export function getMealRepository(): MealRepository {
  return repository;
}
