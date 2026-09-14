import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  MEAL_REPOSITORY_MESSAGES,
  MealRepositoryError,
  toMealRepositoryError,
  type MealRepository,
} from '@/features/meals/repositories/mealRepository';
import type { Meal, MealInput } from '@/features/meals/types';
import {
  applyMealUpdate,
  createMeal,
  isRecord,
  normalizeStoredMeal,
  normalizeStoredMeals,
  readStoredMealId,
} from '@/features/meals/utils/mealRecords';
import type { LocalDateKey } from '@/utils/date';
import { createId } from '@/utils/id';
import { createSerialQueue, type SerialQueue } from '@/utils/serialQueue';

export const ASYNC_STORAGE_MEALS_KEY = 'meals';

type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

type AsyncStorageMealRepositoryOptions = {
  storage?: KeyValueStorage;
  queue?: SerialQueue;
  generateId?: () => string;
  now?: () => Date;
};

export function createAsyncStorageMealRepository({
  storage = AsyncStorage,
  queue = createSerialQueue(),
  generateId = createId,
  now = () => new Date(),
}: AsyncStorageMealRepositoryOptions = {}): MealRepository {
  const readRecords = async (): Promise<unknown[]> => {
    let json: string | null;
    try {
      json = await storage.getItem(ASYNC_STORAGE_MEALS_KEY);
    } catch (error) {
      throw new MealRepositoryError('read_failed', MEAL_REPOSITORY_MESSAGES.readFailed, { cause: error });
    }
    if (json === null) {
      return [];
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (error) {
      throw new MealRepositoryError('read_failed', 'Saved meal data is damaged and could not be read.', {
        cause: error,
      });
    }
    if (!Array.isArray(parsed)) {
      throw new MealRepositoryError('read_failed', 'Saved meal data has an unexpected format.');
    }
    return parsed;
  };

  const writeRecords = async (records: readonly unknown[]): Promise<void> => {
    try {
      await storage.setItem(ASYNC_STORAGE_MEALS_KEY, JSON.stringify(records));
    } catch (error) {
      throw new MealRepositoryError('write_failed', MEAL_REPOSITORY_MESSAGES.writeFailed, { cause: error });
    }
  };

  const write = <T>(task: () => Promise<T>): Promise<T> =>
    queue.run(async () => {
      try {
        return await task();
      } catch (error) {
        throw toMealRepositoryError(error, 'write_failed', MEAL_REPOSITORY_MESSAGES.writeFailed);
      }
    });

  return {
    listMeals: async () => normalizeStoredMeals(await readRecords()),

    getMealById: async (id: string) => {
      const record = (await readRecords()).find((candidate) => readStoredMealId(candidate) === id);
      return record === undefined ? null : normalizeStoredMeal(record);
    },

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
      return write(async () => {
        const records = await readRecords();
        const meal = createMeal(input, { id, now: now() });
        await writeRecords([meal, ...records]);
        return meal;
      });
    },

    updateMeal: (id: string, input: MealInput) =>
      write(async () => {
        const records = await readRecords();
        const index = records.findIndex((record) => readStoredMealId(record) === id);
        const current = index === -1 ? null : normalizeStoredMeal(records[index]);
        if (current === null) {
          throw new MealRepositoryError('not_found', MEAL_REPOSITORY_MESSAGES.notFound);
        }
        const updated: Meal = applyMealUpdate(current, input, now());
        const original = records[index];
        const nextRecords = [...records];
        nextRecords[index] = isRecord(original) ? { ...original, ...updated } : updated;
        await writeRecords(nextRecords);
        return updated;
      }),

    deleteMeal: (id: string) =>
      write(async () => {
        const records = await readRecords();
        await writeRecords(records.filter((record) => readStoredMealId(record) !== id));
      }),

    deleteMealsForDate: (date: LocalDateKey) =>
      write(async () => {
        const records = await readRecords();
        const remaining = records.filter((record) => normalizeStoredMeal(record)?.date !== date);
        const deletedCount = records.length - remaining.length;
        if (deletedCount > 0) {
          await writeRecords(remaining);
        }
        return deletedCount;
      }),

    deleteAllMeals: () =>
      write(async () => {
        const deletedCount = normalizeStoredMeals(await readRecords()).length;
        try {
          await storage.removeItem(ASYNC_STORAGE_MEALS_KEY);
        } catch (error) {
          throw new MealRepositoryError('write_failed', MEAL_REPOSITORY_MESSAGES.writeFailed, { cause: error });
        }
        return deletedCount;
      }),
  };
}
