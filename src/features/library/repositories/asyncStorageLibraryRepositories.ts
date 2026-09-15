import AsyncStorage from '@react-native-async-storage/async-storage';

import { LIBRARY_LIMITS, LIBRARY_MESSAGES } from '@/features/library/constants';
import {
  LibraryRepositoryError,
  notFoundError,
  toLibraryRepositoryError,
  type FoodRepository,
} from '@/features/library/repositories/libraryRepositories';
import type { Food, FoodPortion, Recipe, SavedMeal } from '@/features/library/types';
import {
  isSameFoodDefinition,
  isValidFoodInput,
  parseFoodRecord,
  parseRecipeRecord,
  parseSavedMealRecord,
} from '@/features/library/utils/libraryRecords';
import {
  compareByNameThenId,
  matchesNameSearch,
  toNameKey,
} from '@/features/library/utils/librarySearch';
import { createId } from '@/utils/id';
import { createSerialQueue, type SerialQueue } from '@/utils/serialQueue';

export const LIBRARY_STORAGE_KEY = 'food_library';

export const LIBRARY_BACKUP_STORAGE_KEY = 'food_library_unreadable_backup';

export const LIBRARY_STORAGE_VERSION = 1;

type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export type LibraryState = {
  foods: Food[];
  savedMeals: SavedMeal[];
  recipes: Recipe[];
};

type LoadedLibrary = {
  state: LibraryState;
  raw: string | null;
  clean: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseList<T extends { id: string }>(value: unknown, parse: (entry: unknown) => T | null): { items: T[]; clean: boolean } {
  if (value === undefined) {
    return { items: [], clean: true };
  }
  if (!Array.isArray(value)) {
    return { items: [], clean: false };
  }
  const items: T[] = [];
  const ids = new Set<string>();
  let clean = true;
  for (const entry of value) {
    const parsed = parse(entry);
    if (parsed === null || ids.has(parsed.id)) {
      clean = false;
      continue;
    }
    ids.add(parsed.id);
    items.push(parsed);
  }
  return { items, clean };
}

export function parseLibraryState(raw: string): { state: LibraryState; clean: boolean } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: { foods: [], savedMeals: [], recipes: [] }, clean: false };
  }
  if (!isRecord(parsed) || typeof parsed.version !== 'number') {
    return { state: { foods: [], savedMeals: [], recipes: [] }, clean: false };
  }
  if (parsed.version > LIBRARY_STORAGE_VERSION) {
    throw new LibraryRepositoryError('unsupported_version', LIBRARY_MESSAGES.unsupportedVersion);
  }
  if (parsed.version !== LIBRARY_STORAGE_VERSION) {
    return { state: { foods: [], savedMeals: [], recipes: [] }, clean: false };
  }
  const foods = parseList(parsed.foods, parseFoodRecord);
  const savedMeals = parseList(parsed.savedMeals, parseSavedMealRecord);
  const recipes = parseList(parsed.recipes, parseRecipeRecord);
  return {
    state: { foods: foods.items, savedMeals: savedMeals.items, recipes: recipes.items },
    clean: foods.clean && savedMeals.clean && recipes.clean,
  };
}

export function createAsyncStorageLibraryStore({
  storage = AsyncStorage,
  queue = createSerialQueue(),
}: { storage?: KeyValueStorage; queue?: SerialQueue } = {}) {
  const load = async (): Promise<LoadedLibrary> => {
    let raw: string | null;
    try {
      raw = await storage.getItem(LIBRARY_STORAGE_KEY);
    } catch (error) {
      throw new LibraryRepositoryError('read_failed', LIBRARY_MESSAGES.readFailed, { cause: error });
    }
    if (raw === null) {
      return { state: { foods: [], savedMeals: [], recipes: [] }, raw, clean: true };
    }
    const { state, clean } = parseLibraryState(raw);
    return { state, raw, clean };
  };

  return {
    read: async (): Promise<LibraryState> => {
      try {
        return (await load()).state;
      } catch (error) {
        throw toLibraryRepositoryError(error, 'read_failed', LIBRARY_MESSAGES.readFailed);
      }
    },

    update: <T>(change: (state: LibraryState) => { state: LibraryState; result: T }): Promise<T> =>
      queue.run(async () => {
        try {
          const loaded = await load();
          const { state, result } = change(loaded.state);
          if (!loaded.clean && loaded.raw !== null && (await storage.getItem(LIBRARY_BACKUP_STORAGE_KEY)) === null) {
            await storage.setItem(LIBRARY_BACKUP_STORAGE_KEY, loaded.raw);
          }
          await storage.setItem(
            LIBRARY_STORAGE_KEY,
            JSON.stringify({ version: LIBRARY_STORAGE_VERSION, foods: state.foods, savedMeals: state.savedMeals, recipes: state.recipes }),
          );
          return result;
        } catch (error) {
          throw toLibraryRepositoryError(error, 'write_failed', LIBRARY_MESSAGES.writeFailed);
        }
      }),
  };
}

export type AsyncStorageLibraryStore = ReturnType<typeof createAsyncStorageLibraryStore>;

type RepositoryOptions = {
  generateId?: () => string;
  now?: () => Date;
};

function idGenerator(generateId: () => string) {
  return (): string => {
    try {
      return generateId();
    } catch (error) {
      throw new LibraryRepositoryError('id_generation_failed', LIBRARY_MESSAGES.idGenerationFailed, { cause: error });
    }
  };
}

function detachFood(portions: readonly FoodPortion[], foodId: string): FoodPortion[] {
  return portions.map((portion) => (portion.foodId === foodId ? { ...portion, foodId: null } : portion));
}

export function createAsyncStorageLibraryRepositories(
  store: AsyncStorageLibraryStore,
  { generateId = createId, now = () => new Date() }: RepositoryOptions = {},
): { foods: FoodRepository } {
  const newId = idGenerator(generateId);
  const invalid = () => new LibraryRepositoryError('invalid_data', LIBRARY_MESSAGES.invalidData);

  const foods: FoodRepository = {
    listFoods: async ({ search, favoritesOnly = false, limit = LIBRARY_LIMITS.listLimit }) =>
      (await store.read()).foods
        .filter((food) => (!favoritesOnly || food.isFavorite) && matchesNameSearch(toNameKey(food.name), search))
        .sort(compareByNameThenId)
        .slice(0, limit),

    getFood: async (id) => (await store.read()).foods.find((food) => food.id === id) ?? null,

    getFoodsByIds: async (ids) => {
      const wanted = new Set(ids);
      return (await store.read()).foods.filter((food) => wanted.has(food.id));
    },

    createFood: (input) => {
      if (!isValidFoodInput(input)) {
        return Promise.reject(invalid());
      }
      return store.update((state) => {
        if (state.foods.some((food) => isSameFoodDefinition(food, input))) {
          throw new LibraryRepositoryError('duplicate', LIBRARY_MESSAGES.duplicateFood);
        }
        const timestamp = now().toISOString();
        const food: Food = {
          ...input,
          id: newId(),
          isFavorite: false,
          favoritedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        return { state: { ...state, foods: [...state.foods, food] }, result: food };
      });
    },

    updateFood: (id, input) => {
      if (!isValidFoodInput(input)) {
        return Promise.reject(invalid());
      }
      return store.update((state) => {
        const current = state.foods.find((food) => food.id === id);
        if (!current) {
          throw notFoundError();
        }
        if (state.foods.some((food) => food.id !== id && isSameFoodDefinition(food, input))) {
          throw new LibraryRepositoryError('duplicate', LIBRARY_MESSAGES.duplicateFood);
        }
        const updated: Food = { ...current, ...input, updatedAt: now().toISOString() };
        return { state: { ...state, foods: state.foods.map((food) => (food.id === id ? updated : food)) }, result: updated };
      });
    },

    setFavorite: (id, favorite) =>
      store.update((state) => {
        const current = state.foods.find((food) => food.id === id);
        if (!current) {
          throw notFoundError();
        }
        const updated: Food = favorite
          ? { ...current, isFavorite: true, favoritedAt: current.favoritedAt ?? now().toISOString() }
          : { ...current, isFavorite: false, favoritedAt: null };
        return { state: { ...state, foods: state.foods.map((food) => (food.id === id ? updated : food)) }, result: updated };
      }),

    countReferences: async (id) => {
      const state = await store.read();
      return {
        savedMeals: state.savedMeals.filter((meal) => meal.items.some((item) => item.foodId === id)).length,
        recipes: state.recipes.filter((recipe) => recipe.ingredients.some((item) => item.foodId === id)).length,
      };
    },

    deleteFood: (id) =>
      store.update((state) => ({
        state: {
          foods: state.foods.filter((food) => food.id !== id),
          savedMeals: state.savedMeals.map((meal) => ({ ...meal, items: detachFood(meal.items, id) })),
          recipes: state.recipes.map((recipe) => ({ ...recipe, ingredients: detachFood(recipe.ingredients, id) })),
        },
        result: undefined,
      })),
  };

  return { foods };
}
