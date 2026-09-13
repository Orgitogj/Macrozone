import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Meal, NewMealInput } from '@/features/meals/types';
import {
  createMeal,
  normalizeStoredMeals,
  readStoredMealId,
} from '@/features/meals/utils/mealRecords';

export const MEALS_STORAGE_KEY = 'meals';

export class MealStorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MealStorageError';
  }
}

async function readStoredRecords(): Promise<unknown[]> {
  let json: string | null;
  try {
    json = await AsyncStorage.getItem(MEALS_STORAGE_KEY);
  } catch (error) {
    throw new MealStorageError('Could not read meals from device storage.', {
      cause: error,
    });
  }
  if (json === null) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new MealStorageError('Saved meal data is damaged and could not be read.', {
      cause: error,
    });
  }
  if (!Array.isArray(parsed)) {
    throw new MealStorageError('Saved meal data has an unexpected format.');
  }
  return parsed;
}

async function writeStoredRecords(records: readonly unknown[]): Promise<void> {
  try {
    await AsyncStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    throw new MealStorageError('Could not save meals to device storage.', {
      cause: error,
    });
  }
}

export async function getMeals(): Promise<Meal[]> {
  const records = await readStoredRecords();
  const meals = normalizeStoredMeals(records);
  if (__DEV__ && meals.length !== records.length) {
    console.warn(
      `[meals] Skipped ${records.length - meals.length} stored record(s) that could not be read.`,
    );
  }
  return meals;
}

export async function addMeal(input: NewMealInput): Promise<Meal> {
  const records = await readStoredRecords();
  const meal = createMeal(input, { id: Date.now().toString(), now: new Date() });
  await writeStoredRecords([meal, ...records]);
  return meal;
}

export async function deleteMeal(id: string): Promise<void> {
  const records = await readStoredRecords();
  await writeStoredRecords(
    records.filter((record) => readStoredMealId(record) !== id),
  );
}

export async function clearAllMeals(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MEALS_STORAGE_KEY);
  } catch (error) {
    throw new MealStorageError('Could not clear meals from device storage.', {
      cause: error,
    });
  }
}
