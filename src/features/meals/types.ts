import type { MEAL_TYPES } from '@/features/meals/constants';
import type {
  DailyNutritionGoals,
  MacroGoalBreakdown,
} from '@/features/nutrition-goals';
import type { MacroTotals } from '@/types/nutrition';
import type { LocalDateKey } from '@/utils/date';

export type MealType = (typeof MEAL_TYPES)[number];

export type Meal = MacroTotals & {
  id: string;
  name: string;
  mealType: MealType;
  date: LocalDateKey;
  createdAt: string;
};

export type NewMealInput = Pick<
  Meal,
  'name' | 'calories' | 'protein' | 'carbs' | 'fat'
>;

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
