import {
  FALLBACK_MEAL_TYPE,
  MEAL_TYPE_HOUR_RANGES,
  MEAL_TYPES,
} from '@/features/meals/constants';
import type { MealType } from '@/features/meals/types';

export function isMealType(value: unknown): value is MealType {
  return (
    typeof value === 'string' && (MEAL_TYPES as readonly string[]).includes(value)
  );
}

export function inferMealTypeFromDate(date: Date): MealType {
  const hour = date.getHours();
  const range = MEAL_TYPE_HOUR_RANGES.find(
    ({ startHour, endHour }) => hour >= startHour && hour < endHour,
  );
  return range?.mealType ?? FALLBACK_MEAL_TYPE;
}
