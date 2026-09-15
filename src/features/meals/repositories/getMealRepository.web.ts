import { createAsyncStorageMealRepository } from '@/features/meals/repositories/asyncStorageMealRepository';
import type { MealRepository } from '@/features/meals/repositories/mealRepository';
import { localDataWriteQueue } from '@/storage/database/writeQueue';

const repository = createAsyncStorageMealRepository({ queue: localDataWriteQueue });

export function getMealRepository(): MealRepository {
  return repository;
}
