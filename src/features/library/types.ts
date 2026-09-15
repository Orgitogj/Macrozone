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

export type FoodListQuery = {
  search?: string;
  favoritesOnly?: boolean;
  limit?: number;
};

export type FoodReferenceCounts = {
  savedMeals: number;
  recipes: number;
};
