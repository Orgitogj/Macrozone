import type { Food, SavedMeal } from '@/features/library/types';
import {
  calculateLoggedPortionNutrition,
  exceedsDiaryEntryLimits,
  NutritionCalculationError,
} from '@/features/library/utils/nutritionMath';
import { ENTRY_LIMIT_MESSAGE } from '@/features/library/validation/portions';
import type { MealType, NewDiaryEntry } from '@/features/meals/types';
import { compareDateKeys, isLocalDateKey, type LocalDateKey } from '@/utils/date';

export type LogDestination = {
  date: LocalDateKey;
  mealType: MealType;
};

export type EntryBuildResult = { ok: true; entries: NewDiaryEntry[] } | { ok: false; message: string };

export function validateDestination(destination: LogDestination, todayKey: LocalDateKey): string | null {
  if (!isLocalDateKey(destination.date)) {
    return 'Choose a valid date.';
  }
  return compareDateKeys(destination.date, todayKey) > 0 ? "The date can't be in the future." : null;
}

function guard(build: () => NewDiaryEntry[], destination: LogDestination, todayKey: LocalDateKey): EntryBuildResult {
  const destinationError = validateDestination(destination, todayKey);
  if (destinationError) {
    return { ok: false, message: destinationError };
  }
  try {
    const entries = build();
    if (entries.some((entry) => exceedsDiaryEntryLimits(entry.input))) {
      return { ok: false, message: ENTRY_LIMIT_MESSAGE };
    }
    return { ok: true, entries };
  } catch (error) {
    if (error instanceof NutritionCalculationError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

export function buildFoodEntry(food: Food, amount: number, destination: LogDestination, todayKey: LocalDateKey): EntryBuildResult {
  return guard(
    () => [
      {
        input: {
          name: food.name,
          ...calculateLoggedPortionNutrition({ serving: food.serving, nutrition: food.nutrition, amount }),
          mealType: destination.mealType,
          date: destination.date,
          time: null,
        },
        source: {
          sourceType: 'food',
          foodId: food.id,
          recipeId: null,
          savedMealId: null,
          sourceName: food.name,
          serving: { ...food.serving },
          baseNutrition: { ...food.nutrition },
          amount,
        },
      },
    ],
    destination,
    todayKey,
  );
}

export function buildSavedMealEntries(savedMeal: SavedMeal, destination: LogDestination, todayKey: LocalDateKey): EntryBuildResult {
  return guard(
    () =>
      savedMeal.items.map((item) => ({
        input: {
          name: item.foodName,
          ...calculateLoggedPortionNutrition(item),
          mealType: destination.mealType,
          date: destination.date,
          time: null,
        },
        source: {
          sourceType: 'food' as const,
          foodId: item.foodId,
          recipeId: null,
          savedMealId: savedMeal.id,
          sourceName: item.foodName,
          serving: { ...item.serving },
          baseNutrition: { ...item.nutrition },
          amount: item.amount,
        },
      })),
    destination,
    todayKey,
  );
}
