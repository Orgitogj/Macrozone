export { DEFAULT_DAILY_GOALS } from '@/features/nutrition-goals/constants';
export type {
  DailyNutritionGoals,
  MacroGoalBreakdown,
  MacroGoalProgress,
} from '@/features/nutrition-goals/types';
export {
  calculateMacroGoalProgress,
  calculateRemainingMacros,
} from '@/features/nutrition-goals/utils/remainingMacros';
