import type { DailyNutritionGoals } from '@/features/nutrition-goals/types';

export const DEFAULT_DAILY_GOALS: Readonly<DailyNutritionGoals> = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
};
