import {
  createAsyncStorageLibraryRepositories,
  createAsyncStorageLibraryStore,
} from '@/features/library/repositories/asyncStorageLibraryRepositories';
import type {
  FoodRepository,
  RecipeRepository,
  SavedMealRepository,
} from '@/features/library/repositories/libraryRepositories';

const repositories = createAsyncStorageLibraryRepositories(createAsyncStorageLibraryStore());

export function getLibraryRepositories(): {
  foods: FoodRepository;
  savedMeals: SavedMealRepository;
  recipes: RecipeRepository;
} {
  return repositories;
}
