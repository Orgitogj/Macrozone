import AsyncStorage from '@react-native-async-storage/async-storage';

import { ASYNC_STORAGE_MEALS_KEY } from '@/features/meals/repositories/asyncStorageMealRepository';
import type { DiaryLogRepository } from '@/features/meals/repositories/diaryLogRepository';
import {
  MEAL_REPOSITORY_MESSAGES,
  MealRepositoryError,
  toMealRepositoryError,
} from '@/features/meals/repositories/mealRepository';
import type { Meal, MealEntrySource, RecentFoodUsage } from '@/features/meals/types';
import { isLibraryEntrySource, MEAL_ENTRY_SOURCE_RECORD_KEY, parseStoredMealEntrySource } from '@/features/meals/utils/mealEntrySources';
import { createMeal, isRecord, normalizeStoredMeal, readStoredMealId } from '@/features/meals/utils/mealRecords';
import { createId } from '@/utils/id';
import { createSerialQueue, type SerialQueue } from '@/utils/serialQueue';

type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

type Options = {
  storage?: KeyValueStorage;
  queue?: SerialQueue;
  generateId?: () => string;
  now?: () => Date;
};

export function createAsyncStorageDiaryLogRepository({
  storage = AsyncStorage,
  queue = createSerialQueue(),
  generateId = createId,
  now = () => new Date(),
}: Options = {}): DiaryLogRepository {
  const newId = (): string => {
    try {
      return generateId();
    } catch (error) {
      throw new MealRepositoryError('id_generation_failed', MEAL_REPOSITORY_MESSAGES.idGenerationFailed, { cause: error });
    }
  };

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
      throw new MealRepositoryError('read_failed', 'Saved meal data is damaged and could not be read.', { cause: error });
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

  const toRecord = (meal: Meal, source: MealEntrySource | null) =>
    source ? { ...meal, [MEAL_ENTRY_SOURCE_RECORD_KEY]: source } : { ...meal };

  return {
    logEntries: (entries, { group }) => {
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
      return write(async () => {
        const records = await readRecords();
        const base = now().getTime();
        const meals: Meal[] = [];
        const created = entries.map((entry, index) => {
          const meal = createMeal(entry.input, { id: ids[index], now: new Date(base + (entries.length - 1 - index)) });
          meals.push(meal);
          return toRecord(meal, { ...entry.source, logGroupId: groupId, loggedAt: meal.createdAt });
        });
        await writeRecords([...created, ...records]);
        return meals;
      });
    },

    getEntrySource: async (mealId) => {
      const record = (await readRecords()).find((candidate) => readStoredMealId(candidate) === mealId);
      return isRecord(record) ? parseStoredMealEntrySource(record[MEAL_ENTRY_SOURCE_RECORD_KEY]) : null;
    },

    listRecentFoodUsage: async (limit) => {
      const latest = new Map<string, { usage: RecentFoodUsage; mealId: string }>();
      for (const record of await readRecords()) {
        const meal = normalizeStoredMeal(record);
        const source = isRecord(record) ? parseStoredMealEntrySource(record[MEAL_ENTRY_SOURCE_RECORD_KEY]) : null;
        if (!meal || !source || !isLibraryEntrySource(source) || source.foodId === null) {
          continue;
        }
        const current = latest.get(source.foodId);
        if (
          !current ||
          source.loggedAt > current.usage.lastLoggedAt ||
          (source.loggedAt === current.usage.lastLoggedAt && meal.id < current.mealId)
        ) {
          latest.set(source.foodId, {
            mealId: meal.id,
            usage: {
              foodId: source.foodId,
              lastLoggedAt: source.loggedAt,
              lastAmount: source.amount,
              lastServingUnit: source.serving.unit,
            },
          });
        }
      }
      return [...latest.values()]
        .map((entry) => entry.usage)
        .sort((a, b) =>
          a.lastLoggedAt === b.lastLoggedAt
            ? a.foodId < b.foodId
              ? -1
              : a.foodId > b.foodId
                ? 1
                : 0
            : a.lastLoggedAt > b.lastLoggedAt
              ? -1
              : 1,
        )
        .slice(0, limit);
    },

    copyEntries: ({ sourceDate, destinationDate, mealType }) =>
      write(async () => {
        const records = await readRecords();
        const sources = records.flatMap((record) => {
          const meal = normalizeStoredMeal(record);
          if (!meal || meal.date !== sourceDate || (mealType !== null && meal.mealType !== mealType)) {
            return [];
          }
          return [{ meal, source: isRecord(record) ? parseStoredMealEntrySource(record[MEAL_ENTRY_SOURCE_RECORD_KEY]) : null }];
        });
        sources.sort((a, b) =>
          a.meal.createdAt === b.meal.createdAt
            ? a.meal.id < b.meal.id
              ? 1
              : -1
            : a.meal.createdAt < b.meal.createdAt
              ? 1
              : -1,
        );
        const base = now().getTime();
        const groupIds = new Map<string, string>();
        const created: Meal[] = [];
        const newRecords = sources.map(({ meal: original, source }, index) => {
          const meal = createMeal(
            { ...original, date: destinationDate },
            { id: newId(), now: new Date(base + (sources.length - 1 - index)) },
          );
          created.push(meal);
          if (!source) {
            return toRecord(meal, null);
          }
          let groupId: string | null = null;
          if (source.logGroupId) {
            groupId = groupIds.get(source.logGroupId) ?? newId();
            groupIds.set(source.logGroupId, groupId);
          }
          return toRecord(meal, { ...source, logGroupId: groupId, loggedAt: meal.createdAt });
        });
        if (newRecords.length > 0) {
          await writeRecords([...newRecords, ...records]);
        }
        return created;
      }),
  };
}
