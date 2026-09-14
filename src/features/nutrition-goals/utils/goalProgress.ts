import { DEFAULT_DAILY_GOALS } from '@/features/nutrition-goals/constants';
import type {
  DailyNutritionGoals,
  MacroGoalProgress,
  NutritionPlan,
} from '@/features/nutrition-goals/types';

export type GoalProgressDescription = {
  fraction: number;
  hasTarget: boolean;
  isOver: boolean;
  statusText: string;
  accessibilityText: string;
};

export function describeGoalProgress(
  label: string,
  progress: MacroGoalProgress,
  format: (value: number) => string,
): GoalProgressDescription {
  const hasTarget = progress.goal > 0;
  const isOver = progress.exceeded > 0;
  const fraction = hasTarget ? Math.min(progress.consumed / progress.goal, 1) : 0;

  if (!hasTarget) {
    return {
      fraction,
      hasTarget,
      isOver: false,
      statusText: 'No target',
      accessibilityText: `${label}: ${format(progress.consumed)} consumed, no target set`,
    };
  }

  const statusText = isOver
    ? `${format(progress.exceeded)} over`
    : progress.remaining === 0
      ? 'Target reached'
      : `${format(progress.remaining)} left`;
  const percent = Math.round((progress.consumed / progress.goal) * 100);
  return {
    fraction,
    hasTarget,
    isOver,
    statusText,
    accessibilityText: `${label}: ${format(progress.consumed)} of ${format(progress.goal)}, ${percent} percent, ${statusText}`,
  };
}

export function getEffectiveGoals(plan: NutritionPlan | null): DailyNutritionGoals {
  if (plan?.goals) {
    const { calories, protein, carbs, fat } = plan.goals;
    return { calories, protein, carbs, fat };
  }
  return { ...DEFAULT_DAILY_GOALS };
}

export function shouldOfferGoalPersonalization(plan: NutritionPlan): boolean {
  return plan.goals === null && plan.onboardingStatus === null;
}
