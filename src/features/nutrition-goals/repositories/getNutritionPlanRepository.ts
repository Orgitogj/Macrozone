import type { NutritionPlanRepository } from '@/features/nutrition-goals/repositories/nutritionPlanRepository';
import { createSqliteNutritionPlanRepository } from '@/features/nutrition-goals/repositories/sqliteNutritionPlanRepository';
import { getDatabase } from '@/storage/database/openDatabase';

const repository = createSqliteNutritionPlanRepository(getDatabase);

export function getNutritionPlanRepository(): NutritionPlanRepository {
  return repository;
}
