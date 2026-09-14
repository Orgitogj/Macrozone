import { createAsyncStorageNutritionPlanRepository } from '@/features/nutrition-goals/repositories/asyncStorageNutritionPlanRepository';
import type { NutritionPlanRepository } from '@/features/nutrition-goals/repositories/nutritionPlanRepository';

const repository = createAsyncStorageNutritionPlanRepository();

export function getNutritionPlanRepository(): NutritionPlanRepository {
  return repository;
}
