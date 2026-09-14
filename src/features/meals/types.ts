import type { MEAL_TYPES } from '@/features/meals/constants';
import type {
  DailyNutritionGoals,
  MacroGoalBreakdown,
} from '@/features/nutrition-goals/types';
import type { MacroTotals } from '@/types/nutrition';
import type { LocalDateKey } from '@/utils/date';
import type { LocalTime } from '@/utils/time';

export type MealType = (typeof MEAL_TYPES)[number];

export type MealInput = MacroTotals & {
  name: string;
  mealType: MealType;
  date: LocalDateKey;
  time: LocalTime | null;
};

export type Meal = MealInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type MealDateGroup = {
  dateKey: LocalDateKey;
  meals: Meal[];
  totals: MacroTotals;
};

export type DailyMealSummary = {
  dateKey: LocalDateKey;
  meals: Meal[];
  totals: MacroTotals;
  goals: DailyNutritionGoals;
  goalProgress: MacroGoalBreakdown;
};
