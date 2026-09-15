import type {
  FoodRepository,
  RecipeRepository,
  SavedMealRepository,
} from '@/features/library/repositories/libraryRepositories';
import {
  createSqliteRecipeRepository,
  createSqliteSavedMealRepository,
} from '@/features/library/repositories/sqliteCollectionRepositories';
import { createSqliteFoodRepository } from '@/features/library/repositories/sqliteFoodRepository';
import { loadReadyMealDatabase } from '@/features/meals/repositories/getMealRepository';
import { localDataWriteQueue } from '@/storage/database/writeQueue';

const repositories = {
  foods: createSqliteFoodRepository(loadReadyMealDatabase, { queue: localDataWriteQueue }),
  savedMeals: createSqliteSavedMealRepository(loadReadyMealDatabase, { queue: localDataWriteQueue }),
  recipes: createSqliteRecipeRepository(loadReadyMealDatabase, { queue: localDataWriteQueue }),
};

export function getLibraryRepositories(): {
  foods: FoodRepository;
  savedMeals: SavedMealRepository;
  recipes: RecipeRepository;
} {
  return repositories;
}
