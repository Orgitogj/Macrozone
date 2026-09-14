import type { MealType } from '@/features/meals/types';

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export const MEAL_TYPE_LABELS: Readonly<Record<MealType, string>> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export const MEAL_TYPE_HOUR_RANGES: readonly {
  mealType: MealType;
  startHour: number;
  endHour: number;
}[] = [
  { mealType: 'breakfast', startHour: 4, endHour: 11 },
  { mealType: 'lunch', startHour: 11, endHour: 15 },
  { mealType: 'snack', startHour: 15, endHour: 17 },
  { mealType: 'dinner', startHour: 17, endHour: 22 },
];

export const FALLBACK_MEAL_TYPE: MealType = 'snack';

export const MEAL_LIMITS = {
  nameMaxLength: 80,
  maxCalories: 10000,
  maxMacroGrams: 1000,
  maxDecimalPlaces: 2,
} as const;
