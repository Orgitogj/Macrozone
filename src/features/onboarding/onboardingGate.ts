import type { NutritionPlan } from '@/features/nutrition-goals/types';

export function shouldShowOnboarding({ plan, mealCount }: { plan: NutritionPlan; mealCount: number }): boolean {
  return plan.onboardingStatus === null && plan.goals === null && mealCount === 0;
}
