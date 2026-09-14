import { MEAL_TYPES } from '@/features/meals/constants';
import type { Meal, MealType } from '@/features/meals/types';
import { calculateMacroTotals } from '@/features/meals/utils/macroTotals';

export const MEAL_SECTION_LABELS: Readonly<Record<MealType, string>> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export const MEAL_SECTION_EMPTY_MESSAGES: Readonly<Record<MealType, string>> = {
  breakfast: 'No breakfast logged',
  lunch: 'No lunch logged',
  dinner: 'No dinner logged',
  snack: 'No snacks logged',
};

export type MealTypeSection = {
  mealType: MealType;
  label: string;
  emptyMessage: string;
  meals: Meal[];
  calories: number;
};

export function groupMealsByType(meals: readonly Meal[]): MealTypeSection[] {
  return MEAL_TYPES.map((mealType) => {
    const sectionMeals = meals.filter((meal) => meal.mealType === mealType);
    return {
      mealType,
      label: MEAL_SECTION_LABELS[mealType],
      emptyMessage: MEAL_SECTION_EMPTY_MESSAGES[mealType],
      meals: sectionMeals,
      calories: calculateMacroTotals(sectionMeals).calories,
    };
  });
}
