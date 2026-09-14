export { PersonalizeGoalsCard } from '@/features/nutrition-goals/components/PersonalizeGoalsCard';
export { GoalCalculatorFlow } from '@/features/nutrition-goals/components/GoalCalculatorFlow';
export { GoalTargetsEditor } from '@/features/nutrition-goals/components/GoalTargetsEditor';
export {
  DEFAULT_DAILY_GOALS,
  ESTIMATE_DISCLAIMER,
} from '@/features/nutrition-goals/constants';
export { useGoalsNavigation } from '@/features/nutrition-goals/hooks/useGoalsNavigation';
export { useNutritionPlan } from '@/features/nutrition-goals/hooks/useNutritionPlan';
export { GoalCalculatorScreen } from '@/features/nutrition-goals/screens/GoalCalculatorScreen';
export { ManualGoalsScreen } from '@/features/nutrition-goals/screens/ManualGoalsScreen';
export { NutritionGoalsScreen } from '@/features/nutrition-goals/screens/NutritionGoalsScreen';
export {
  getNutritionPlanErrorMessage,
  loadNutritionPlan,
  saveManualGoals,
  skipGoalSetup,
} from '@/features/nutrition-goals/services/nutritionPlanActions';
export type {
  DailyNutritionGoals,
  MacroGoalBreakdown,
  MacroGoalProgress,
  NutritionPlan,
  SavedNutritionGoals,
} from '@/features/nutrition-goals/types';
export {
  describeGoalProgress,
  getEffectiveGoals,
  shouldOfferGoalPersonalization,
} from '@/features/nutrition-goals/utils/goalProgress';
export {
  calculateMacroGoalProgress,
  calculateRemainingMacros,
} from '@/features/nutrition-goals/utils/remainingMacros';
