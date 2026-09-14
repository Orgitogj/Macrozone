import { createAsyncStorageMealRepository } from '@/features/meals/repositories/asyncStorageMealRepository';
import type { MealRepository } from '@/features/meals/repositories/mealRepository';

const repository = createAsyncStorageMealRepository();

export function getMealRepository(): MealRepository {
  return repository;
}
