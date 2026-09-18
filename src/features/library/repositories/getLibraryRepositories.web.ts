import {
  createAsyncStorageLibraryRepositories,
  createAsyncStorageLibraryStore,
} from '@/features/library/repositories/asyncStorageLibraryRepositories';
import type {
  FoodRepository,
  RecipeRepository,
  SavedMealRepository,
} from '@/features/library/repositories/libraryRepositories';
import { localDataWriteQueue } from '@/storage/database/writeQueue';

const repositories = createAsyncStorageLibraryRepositories(createAsyncStorageLibraryStore({ queue: localDataWriteQueue }));

export function getLibraryRepositories(): {
  foods: FoodRepository;
  savedMeals: SavedMealRepository;
  recipes: RecipeRepository;
} {
  return repositories;
}
