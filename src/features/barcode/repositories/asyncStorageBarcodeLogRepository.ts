import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  FOOD_BARCODE_LINKS_BACKUP_STORAGE_KEY,
  FOOD_BARCODE_LINKS_STORAGE_KEY,
  FOOD_BARCODE_LINKS_STORAGE_VERSION,
  parseFoodBarcodeLinks,
} from '@/features/barcode/repositories/asyncStorageBarcodeRepositories';
import {
  BARCODE_LOG_MESSAGES,
  BarcodeLogError,
  isMatchingReplay,
  type BarcodeLogCommitResult,
  type BarcodeLogErrorCode,
  type BarcodeLogRepository,
} from '@/features/barcode/repositories/barcodeLogRepository';
import { ProductCacheError } from '@/features/barcode/repositories/productCacheRepository';
import {
  LIBRARY_BACKUP_STORAGE_KEY,
  LIBRARY_STORAGE_KEY,
  LIBRARY_STORAGE_VERSION,
  parseLibraryState,
  type LibraryState,
} from '@/features/library/repositories/asyncStorageLibraryRepositories';
import { LibraryRepositoryError } from '@/features/library/repositories/libraryRepositories';
import type { Food } from '@/features/library/types';
import { isSameFoodDefinition, isValidFoodInput } from '@/features/library/utils/libraryRecords';
import { ASYNC_STORAGE_MEALS_KEY } from '@/features/meals/repositories/asyncStorageMealRepository';
import { createMeal, isRecord, normalizeStoredMeal, readStoredMealId } from '@/features/meals/utils/mealRecords';
import { MEAL_ENTRY_SOURCE_RECORD_KEY, parseStoredMealEntrySource } from '@/features/meals/utils/mealEntrySources';
import { localDataWriteQueue } from '@/storage/database/writeQueue';
import { createId } from '@/utils/id';
import type { SerialQueue } from '@/utils/serialQueue';

export type TransactionalKeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiSet?(pairs: [string, string][]): Promise<void>;
  multiRemove?(keys: string[]): Promise<void>;
};

type Link = { barcode: string; foodId: string; linkedAt: string };

function fail(code: BarcodeLogErrorCode, cause?: unknown): never {
  throw new BarcodeLogError(code, BARCODE_LOG_MESSAGES[code], cause === undefined ? undefined : { cause });
}

async function writePairs(storage: TransactionalKeyValueStorage, pairs: [string, string][]): Promise<void> {
  if (pairs.length === 0) {
    return;
  }
  if (storage.multiSet) {
    await storage.multiSet(pairs);
    return;
  }
  for (const [key, value] of pairs) {
    await storage.setItem(key, value);
  }
}

async function restoreValues(storage: TransactionalKeyValueStorage, previous: ReadonlyMap<string, string | null>): Promise<void> {
  const setPairs: [string, string][] = [];
  const removeKeys: string[] = [];
  for (const [key, value] of previous) {
    if (value === null) {
      removeKeys.push(key);
    } else {
      setPairs.push([key, value]);
    }
  }
  await writePairs(storage, setPairs);
  if (removeKeys.length > 0) {
    if (storage.multiRemove) {
      await storage.multiRemove(removeKeys);
    } else {
      for (const key of removeKeys) {
        await storage.removeItem(key);
      }
    }
  }
  for (const [key, value] of previous) {
    if ((await storage.getItem(key)) !== value) {
      throw new Error(`Restored value mismatch for ${key}`);
    }
  }
}

function parseMealRecords(raw: string | null): unknown[] {
  if (raw === null) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail('read_failed', error);
  }
  if (!Array.isArray(parsed)) {
    fail('read_failed');
  }
  return parsed;
}

export function createAsyncStorageBarcodeLogRepository({
  storage = AsyncStorage as TransactionalKeyValueStorage,
  queue = localDataWriteQueue,
  generateId = createId,
  now = () => new Date(),
}: {
  storage?: TransactionalKeyValueStorage;
  queue?: SerialQueue;
  generateId?: () => string;
  now?: () => Date;
} = {}): BarcodeLogRepository {
  return {
    commit: (command) =>
      queue.run(async () => {
        const action = command.foodAction;
        if ((action.kind === 'create' || action.kind === 'update_linked') && !isValidFoodInput(action.input)) {
          fail('invalid_data');
        }

        const keys = [ASYNC_STORAGE_MEALS_KEY, LIBRARY_STORAGE_KEY, LIBRARY_BACKUP_STORAGE_KEY, FOOD_BARCODE_LINKS_STORAGE_KEY, FOOD_BARCODE_LINKS_BACKUP_STORAGE_KEY];
        const previous = new Map<string, string | null>();
        try {
          for (const key of keys) {
            previous.set(key, await storage.getItem(key));
          }
        } catch (error) {
          fail('read_failed', error);
        }

        const mealRecords = parseMealRecords(previous.get(ASYNC_STORAGE_MEALS_KEY) ?? null);
        let library: { state: LibraryState; clean: boolean };
        let links: { links: Link[]; clean: boolean };
        try {
          const rawLibrary = previous.get(LIBRARY_STORAGE_KEY) ?? null;
          library = rawLibrary === null ? { state: { foods: [], savedMeals: [], recipes: [] }, clean: true } : parseLibraryState(rawLibrary);
          links = parseFoodBarcodeLinks(previous.get(FOOD_BARCODE_LINKS_STORAGE_KEY) ?? null);
        } catch (error) {
          if (
            (error instanceof LibraryRepositoryError || error instanceof ProductCacheError) &&
            error.code === 'unsupported_version'
          ) {
            fail('unsupported_version', error);
          }
          fail('read_failed', error);
        }

        const existingRecord = mealRecords.find((record) => readStoredMealId(record) === command.operationId);
        if (existingRecord !== undefined) {
          const existingMeal = normalizeStoredMeal(existingRecord);
          const storedSource = isRecord(existingRecord) ? parseStoredMealEntrySource(existingRecord[MEAL_ENTRY_SOURCE_RECORD_KEY]) : null;
          const productSource = storedSource?.sourceType === 'product' ? storedSource : null;
          if (existingMeal === null || !isMatchingReplay(existingMeal, productSource, command)) {
            fail('operation_conflict');
          }
          const food = productSource?.foodId ? (library.state.foods.find((candidate) => candidate.id === productSource.foodId) ?? null) : null;
          return { meal: existingMeal, food, foodOutcome: food ? 'linked' : 'none', replayed: true } satisfies BarcodeLogCommitResult;
        }

        const timestamp = now().toISOString();
        const foodExists = (id: string) => library.state.foods.some((candidate) => candidate.id === id);
        let foods = library.state.foods;
        let nextLinks = links.links;
        let food: Food | null = null;
        let foodOutcome: BarcodeLogCommitResult['foodOutcome'] = 'none';

        const ensureLink = (foodId: string) => {
          const current = nextLinks.find((link) => link.barcode === command.source.barcode && foodExists(link.foodId));
          if (current?.foodId === foodId) {
            return;
          }
          if (current !== undefined) {
            fail('barcode_linked_elsewhere');
          }
          nextLinks = [
            ...nextLinks.filter((link) => link.barcode !== command.source.barcode && foodExists(link.foodId)),
            { barcode: command.source.barcode, foodId, linkedAt: timestamp },
          ];
        };

        switch (action.kind) {
          case 'none':
            break;
          case 'create': {
            const duplicate = foods.find((candidate) => isSameFoodDefinition(candidate, action.input));
            if (duplicate) {
              food = duplicate;
              foodOutcome = 'reused_existing';
            } else {
              food = { ...action.input, id: generateId(), isFavorite: false, favoritedAt: null, createdAt: timestamp, updatedAt: timestamp };
              foods = [...foods, food];
              foodOutcome = 'created';
            }
            ensureLink(food.id);
            break;
          }
          case 'keep_linked': {
            food = foods.find((candidate) => candidate.id === action.foodId) ?? null;
            if (food === null) {
              fail('linked_food_missing');
            }
            ensureLink(food.id);
            foodOutcome = 'linked';
            break;
          }
          case 'update_linked': {
            const current = foods.find((candidate) => candidate.id === action.foodId);
            if (!current) {
              fail('linked_food_missing');
            }
            if (foods.some((candidate) => candidate.id !== current.id && isSameFoodDefinition(candidate, action.input))) {
              fail('duplicate_food');
            }
            const updated: Food = { ...current, ...action.input, updatedAt: timestamp };
            food = updated;
            foods = foods.map((candidate) => (candidate.id === current.id ? updated : candidate));
            ensureLink(updated.id);
            foodOutcome = 'updated';
            break;
          }
        }

        const meal = createMeal(command.meal, { id: command.operationId, now: new Date(timestamp) });
        const source = parseStoredMealEntrySource({ ...command.source, foodId: food?.id ?? null, logGroupId: null, loggedAt: meal.createdAt });
        if (source === null || source.sourceType !== 'product') {
          fail('invalid_data');
        }

        const pairs: [string, string][] = [];
        if (foodOutcome === 'created' || foodOutcome === 'updated') {
          const rawLibrary = previous.get(LIBRARY_STORAGE_KEY) ?? null;
          if (!library.clean && rawLibrary !== null && previous.get(LIBRARY_BACKUP_STORAGE_KEY) === null) {
            pairs.push([LIBRARY_BACKUP_STORAGE_KEY, rawLibrary]);
          }
          const nextLibrary = JSON.stringify({ version: LIBRARY_STORAGE_VERSION, foods, savedMeals: library.state.savedMeals, recipes: library.state.recipes });
          if (parseLibraryState(nextLibrary).state.foods.length !== foods.length) {
            fail('invalid_data');
          }
          pairs.push([LIBRARY_STORAGE_KEY, nextLibrary]);
        }
        const linksChanged =
          nextLinks.length !== links.links.length ||
          nextLinks.some((link, index) => link.barcode !== links.links[index]?.barcode || link.foodId !== links.links[index]?.foodId);
        if (linksChanged) {
          const rawLinks = previous.get(FOOD_BARCODE_LINKS_STORAGE_KEY) ?? null;
          if (!links.clean && rawLinks !== null && previous.get(FOOD_BARCODE_LINKS_BACKUP_STORAGE_KEY) === null) {
            pairs.push([FOOD_BARCODE_LINKS_BACKUP_STORAGE_KEY, rawLinks]);
          }
          pairs.push([FOOD_BARCODE_LINKS_STORAGE_KEY, JSON.stringify({ version: FOOD_BARCODE_LINKS_STORAGE_VERSION, links: nextLinks })]);
        }
        pairs.push([ASYNC_STORAGE_MEALS_KEY, JSON.stringify([{ ...meal, [MEAL_ENTRY_SOURCE_RECORD_KEY]: source }, ...mealRecords])]);

        const touched = new Map(pairs.map(([key]) => [key, previous.get(key) ?? null]));
        try {
          await writePairs(storage, pairs);
        } catch (writeError) {
          try {
            await restoreValues(storage, touched);
          } catch (restoreError) {
            fail('compensation_failed', restoreError);
          }
          fail('write_failed', writeError);
        }
        return { meal, food, foodOutcome, replayed: false } satisfies BarcodeLogCommitResult;
      }),
  };
}
