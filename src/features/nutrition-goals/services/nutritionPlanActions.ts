import { getNutritionPlanRepository } from '@/features/nutrition-goals/repositories/getNutritionPlanRepository';
import {
  NutritionPlanRepositoryError,
  type NutritionPlanRepository,
} from '@/features/nutrition-goals/repositories/nutritionPlanRepository';
import type { DailyNutritionGoals, NutritionPlan } from '@/features/nutrition-goals/types';
import { calculateNutritionTargets } from '@/features/nutrition-goals/utils/goalCalculator';
import type { BodyProfileInput } from '@/features/profile/types';

export function getNutritionPlanErrorMessage(error: unknown, fallback: string): string {
  return error instanceof NutritionPlanRepositoryError ? error.message : fallback;
}

export function loadNutritionPlan(
  repository: NutritionPlanRepository = getNutritionPlanRepository(),
): Promise<NutritionPlan> {
  return repository.getPlan();
}

export function saveCalculatedGoals(
  profile: BodyProfileInput,
  repository: NutritionPlanRepository = getNutritionPlanRepository(),
): Promise<NutritionPlan> {
  const { goals } = calculateNutritionTargets(profile);
  return repository.saveGoals({ goals, source: 'calculated', profile });
}

export function saveAdjustedGoals(
  profile: BodyProfileInput,
  goals: DailyNutritionGoals,
  repository: NutritionPlanRepository = getNutritionPlanRepository(),
): Promise<NutritionPlan> {
  return repository.saveGoals({ goals, source: 'manual', profile });
}

export function saveManualGoals(
  goals: DailyNutritionGoals,
  repository: NutritionPlanRepository = getNutritionPlanRepository(),
): Promise<NutritionPlan> {
  return repository.saveGoals({ goals, source: 'manual' });
}

export function skipGoalSetup(
  repository: NutritionPlanRepository = getNutritionPlanRepository(),
): Promise<NutritionPlan> {
  return repository.skipOnboarding();
}
