import type {
  AiMealEntrySource,
  LibraryMealEntrySource,
  Meal,
  MealEntrySource,
  MealInput,
} from '@/features/meals/types';
import { isRecord } from '@/features/meals/utils/mealRecords';
import { LIBRARY_LIMITS } from '@/features/library/constants';
import { isServingUnit } from '@/features/library/utils/servingFormat';
import { MACRO_KEYS, type MacroTotals } from '@/types/nutrition';

export const MEAL_ENTRY_SOURCE_RECORD_KEY = 'macrozoneEntrySource';

function isNullableId(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.length > 0);
}

function isNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isPositive(value: unknown): value is number {
  return isNonNegative(value) && value > 0;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isShortName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= LIBRARY_LIMITS.nameMaxLength;
}

function parseLibrarySource(value: Record<string, unknown>): LibraryMealEntrySource | null {
  const { sourceType, foodId, recipeId, savedMealId, logGroupId, sourceName, serving, baseNutrition, amount, loggedAt } = value;
  if (
    (sourceType !== 'food' && sourceType !== 'recipe') ||
    !isNullableId(foodId) ||
    !isNullableId(recipeId) ||
    !isNullableId(savedMealId) ||
    !isNullableId(logGroupId) ||
    (sourceType === 'food' && recipeId !== null) ||
    (sourceType === 'recipe' && foodId !== null) ||
    typeof sourceName !== 'string' ||
    sourceName.trim().length === 0 ||
    !isRecord(serving) ||
    !isPositive(serving.amount) ||
    !isServingUnit(serving.unit) ||
    !isRecord(baseNutrition) ||
    !MACRO_KEYS.every((key) => isNonNegative(baseNutrition[key])) ||
    !isPositive(amount) ||
    !isTimestamp(loggedAt)
  ) {
    return null;
  }
  const nutrition: MacroTotals = {
    calories: baseNutrition.calories as number,
    protein: baseNutrition.protein as number,
    carbs: baseNutrition.carbs as number,
    fat: baseNutrition.fat as number,
  };
  return {
    sourceType,
    foodId,
    recipeId,
    savedMealId,
    logGroupId,
    sourceName,
    serving: { amount: serving.amount, unit: serving.unit },
    baseNutrition: nutrition,
    amount,
    loggedAt,
  };
}

function parseAiSource(value: Record<string, unknown>): AiMealEntrySource | null {
  const { inputKind, mealTitle, itemName, amount, unit, matchedFoodId, logGroupId, loggedAt } = value;
  if (
    (inputKind !== 'text' && inputKind !== 'photo') ||
    !isShortName(mealTitle) ||
    !isShortName(itemName) ||
    !isPositive(amount) ||
    !isServingUnit(unit) ||
    !isNullableId(matchedFoodId) ||
    !isNullableId(logGroupId) ||
    !isTimestamp(loggedAt)
  ) {
    return null;
  }
  return { sourceType: 'ai', inputKind, mealTitle, itemName, amount, unit, matchedFoodId, logGroupId, loggedAt };
}

export function parseStoredMealEntrySource(value: unknown): MealEntrySource | null {
  if (!isRecord(value)) {
    return null;
  }
  switch (value.sourceType) {
    case 'ai':
      return parseAiSource(value);
    default:
      return parseLibrarySource(value);
  }
}

export function isLibraryEntrySource(source: MealEntrySource): source is LibraryMealEntrySource {
  return source.sourceType === 'food' || source.sourceType === 'recipe';
}

export function doesUpdateDetachSource(current: Meal, input: MealInput): boolean {
  return current.name !== input.name || MACRO_KEYS.some((key) => current[key] !== input[key]);
}
