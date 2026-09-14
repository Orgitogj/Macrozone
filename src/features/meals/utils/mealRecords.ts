import type { Meal, MealInput } from '@/features/meals/types';
import {
  inferMealTypeFromDate,
  isMealType,
} from '@/features/meals/utils/mealType';
import { MACRO_KEYS, type MacroTotals } from '@/types/nutrition';
import { isLocalDateKey, toLocalDateKey } from '@/utils/date';
import { isLocalTime } from '@/utils/time';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export function readStoredMealId(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const { id } = value;
  if (typeof id === 'string' && id !== '') {
    return id;
  }
  if (typeof id === 'number' && Number.isFinite(id)) {
    return String(id);
  }
  return null;
}

export function normalizeStoredMeal(value: unknown): Meal | null {
  const id = readStoredMealId(value);
  if (id === null || !isRecord(value)) {
    return null;
  }
  const { name, createdAt } = value;
  if (typeof name !== 'string' || !isValidTimestamp(createdAt)) {
    return null;
  }
  const createdAtDate = new Date(createdAt);

  const macros = {} as MacroTotals;
  for (const key of MACRO_KEYS) {
    macros[key] = toFiniteNumber(value[key]);
  }

  return {
    id,
    name,
    ...macros,
    mealType: isMealType(value.mealType)
      ? value.mealType
      : inferMealTypeFromDate(createdAtDate),
    date: isLocalDateKey(value.date) ? value.date : toLocalDateKey(createdAtDate),
    time: isLocalTime(value.time) ? value.time : null,
    createdAt,
    updatedAt: isValidTimestamp(value.updatedAt) ? value.updatedAt : createdAt,
  };
}

export function normalizeStoredMeals(values: readonly unknown[]): Meal[] {
  return values.flatMap((value) => {
    const meal = normalizeStoredMeal(value);
    return meal ? [meal] : [];
  });
}

function pickMealInput(input: MealInput): MealInput {
  return {
    name: input.name,
    calories: input.calories,
    protein: input.protein,
    carbs: input.carbs,
    fat: input.fat,
    mealType: input.mealType,
    date: input.date,
    time: input.time,
  };
}

export function createMeal(
  input: MealInput,
  { id, now }: { id: string; now: Date },
): Meal {
  const timestamp = now.toISOString();
  return {
    id,
    ...pickMealInput(input),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function applyMealUpdate(meal: Meal, input: MealInput, now: Date): Meal {
  return {
    ...meal,
    ...pickMealInput(input),
    updatedAt: now.toISOString(),
  };
}
