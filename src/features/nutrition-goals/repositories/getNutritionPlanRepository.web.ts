import { getScopedStorage } from '@/features/account/repositories/getScopedStorage';
import { createAsyncStorageNutritionPlanRepository } from '@/features/nutrition-goals/repositories/asyncStorageNutritionPlanRepository';
import type { NutritionPlanRepository } from '@/features/nutrition-goals/repositories/nutritionPlanRepository';
import { localDataWriteQueue } from '@/storage/database/writeQueue';

const repository = createAsyncStorageNutritionPlanRepository({ storage: getScopedStorage(), queue: localDataWriteQueue });

export function getNutritionPlanRepository(): NutritionPlanRepository {
  return repository;
}
