import type { Meal, NewMealInput } from '@/features/meals/types';
import {
  inferMealTypeFromDate,
  isMealType,
} from '@/features/meals/utils/mealType';
import { MACRO_KEYS, type MacroTotals } from '@/types/nutrition';
import { isLocalDateKey, toLocalDateKey } from '@/utils/date';

function isRecord(value: unknown): value is Record<string, unknown> {
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
  if (typeof name !== 'string' || typeof createdAt !== 'string') {
    return null;
  }
  const createdAtDate = new Date(createdAt);
  if (Number.isNaN(createdAtDate.getTime())) {
    return null;
  }

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
    createdAt,
  };
}

export function normalizeStoredMeals(values: readonly unknown[]): Meal[] {
  return values.flatMap((value) => {
    const meal = normalizeStoredMeal(value);
    return meal ? [meal] : [];
  });
}

export function createMeal(
  input: NewMealInput,
  { id, now }: { id: string; now: Date },
): Meal {
  return {
    id,
    name: input.name,
    calories: input.calories,
    protein: input.protein,
    carbs: input.carbs,
    fat: input.fat,
    mealType: inferMealTypeFromDate(now),
    date: toLocalDateKey(now),
    createdAt: now.toISOString(),
  };
}
