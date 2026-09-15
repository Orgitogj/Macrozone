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
import { getDatabase } from '@/storage/database/openDatabase';
import type { SqlDatabase } from '@/storage/database/types';
import { localDataWriteQueue } from '@/storage/database/writeQueue';

export function createReadyDatabaseLoader(
  openDatabase: () => Promise<SqlDatabase>,
  readLegacyValue: () => Promise<string | null>,
): () => Promise<SqlDatabase> {
  let pending: Promise<SqlDatabase> | null = null;
  return () => {
    if (pending === null) {
      pending = (async () => {
        try {
          const database = await openDatabase();
          await importLegacyMeals(database, { readLegacyValue });
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
      pending.catch(() => {
        pending = null;
      });
    }
    return pending;
  };
}

const loadReadyDatabase = createReadyDatabaseLoader(getDatabase, () =>
  AsyncStorage.getItem(LEGACY_MEALS_STORAGE_KEY),
);

const repository = createSqliteMealRepository(loadReadyDatabase, { queue: localDataWriteQueue });

export function getMealRepository(): MealRepository {
  return repository;
}
