import { useCallback } from 'react';

import { useLibraryResource } from '@/features/library/hooks/useLibraryResource';
import { getLibraryService } from '@/features/library/services/libraryActions';
import type { Food, Recipe, SavedMeal } from '@/features/library/types';
import {
  describeFoodRow,
  describeRecipeRow,
  describeSavedMealRow,
  type RowText,
} from '@/features/library/utils/libraryRowText';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export const ADD_MODES = ['recent', 'favorites', 'foods', 'savedMeals', 'recipes', 'manual'] as const;

export type AddMode = (typeof ADD_MODES)[number];

export type LibraryMode = Exclude<AddMode, 'manual'>;

export type AddHubRow =
  | { key: string; kind: 'food'; food: Food; suggestedAmount: number | null; text: RowText }
  | { key: string; kind: 'savedMeal'; savedMeal: SavedMeal; text: RowText }
  | { key: string; kind: 'recipe'; recipe: Recipe; text: RowText };

type HubData = {
  mode: LibraryMode;
  search: string;
  rows: AddHubRow[];
};

async function loadRows(mode: LibraryMode, search: string): Promise<AddHubRow[]> {
  const service = getLibraryService();
  switch (mode) {
    case 'recent':
      return (await service.listRecentFoods()).map((recent) => ({
        key: `food-${recent.food.id}`,
        kind: 'food',
        food: recent.food,
        suggestedAmount: recent.suggestedAmount,
        text: describeFoodRow(recent.food),
      }));
    case 'favorites':
    case 'foods':
      return (await service.listFoods({ search, favoritesOnly: mode === 'favorites' })).map((food) => ({
        key: `food-${food.id}`,
        kind: 'food',
        food,
        suggestedAmount: null,
        text: describeFoodRow(food),
      }));
    case 'savedMeals':
      return (await service.listSavedMeals({ search })).map((savedMeal) => ({
        key: `saved-${savedMeal.id}`,
        kind: 'savedMeal',
        savedMeal,
        text: describeSavedMealRow(savedMeal),
      }));
    case 'recipes':
      return (await service.listRecipes({ search })).map((recipe) => ({
        key: `recipe-${recipe.id}`,
        kind: 'recipe',
        recipe,
        text: describeRecipeRow(recipe),
      }));
  }
}

export function useAddHubRows(mode: LibraryMode, search: string) {
  const debouncedSearch = useDebouncedValue(search, 200);
  const effectiveSearch = mode === 'recent' ? '' : debouncedSearch;
  const load = useCallback(
    async (): Promise<HubData> => ({ mode, search: effectiveSearch, rows: await loadRows(mode, effectiveSearch) }),
    [mode, effectiveSearch],
  );
  const { resource, retry, reload, setResource } = useLibraryResource(load, 'Could not load your food library.');
  const data = resource.status === 'ready' ? resource.data : null;
  const isCurrent = data !== null && data.mode === mode;

  return {
    resource,
    rows: isCurrent ? data.rows : null,
    appliedSearch: isCurrent ? data.search : '',
    retry,
    reload,
    setResource,
  };
}
