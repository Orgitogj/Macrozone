import type { SERVING_UNITS } from '@/features/library/constants';
import type { MacroTotals } from '@/types/nutrition';

export type ServingUnit = (typeof SERVING_UNITS)[number];

export type Serving = {
  amount: number;
  unit: ServingUnit;
};

export type FoodInput = {
  name: string;
  serving: Serving;
  nutrition: MacroTotals;
};

export type Food = FoodInput & {
  id: string;
  isFavorite: boolean;
  favoritedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FoodPortionInput = {
  foodId: string | null;
  foodName: string;
  serving: Serving;
  nutrition: MacroTotals;
  amount: number;
};

export type FoodPortion = FoodPortionInput & {
  id: string;
};

export type SavedMealInput = {
  name: string;
  items: FoodPortionInput[];
};

export type SavedMeal = {
  id: string;
  name: string;
  items: FoodPortion[];
  createdAt: string;
  updatedAt: string;
};

export type FoodListQuery = {
  search?: string;
  favoritesOnly?: boolean;
  limit?: number;
};

export type LibraryListQuery = {
  search?: string;
  limit?: number;
};

export type FoodReferenceCounts = {
  savedMeals: number;
  recipes: number;
};
