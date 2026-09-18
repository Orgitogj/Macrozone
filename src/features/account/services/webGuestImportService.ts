import { accountStoragePrefix } from '@/features/account/utils/accountKey';
import type {
  GuestDataCounts,
  GuestImportDecision,
  GuestImportOptions,
  GuestImportSummary,
} from '@/features/account/services/guestImportService';
import { GuestImportError } from '@/features/account/services/guestImportService';
import {
  applyAggregateToSnapshot,
  listSnapshotEntities,
  readAggregateFromSnapshot,
  readSnapshotFrom,
  serializeLibrary,
  serializeLinks,
  serializePlan,
  type WebSnapshotState,
} from '@/features/sync/repositories/webAggregateStore';
import { FOOD_BARCODE_LINKS_STORAGE_KEY } from '@/features/barcode/repositories/asyncStorageBarcodeRepositories';
import { LIBRARY_STORAGE_KEY } from '@/features/library/repositories/asyncStorageLibraryRepositories';
import { ASYNC_STORAGE_MEALS_KEY } from '@/features/meals/repositories/asyncStorageMealRepository';
import { NUTRITION_PLAN_STORAGE_KEY } from '@/features/nutrition-goals/repositories/asyncStorageNutritionPlanRepository';
import type { SyncAggregate, SyncEntityType } from '@/features/sync/types';
import { createId } from '@/utils/id';

export const GUEST_IMPORT_RECORD_KEY = 'guest_import';

const COUNT_KEYS: Record<SyncEntityType, keyof GuestDataCounts> = {
  meal: 'meals',
  food: 'foods',
  saved_meal: 'savedMeals',
  recipe: 'recipes',
  nutrition_plan: 'nutritionPlan',
};

const IMPORT_ORDER: readonly SyncEntityType[] = ['food', 'saved_meal', 'recipe', 'meal', 'nutrition_plan'];

const EMPTY_COUNTS: GuestDataCounts = { meals: 0, foods: 0, savedMeals: 0, recipes: 0, nutritionPlan: 0 };

type PlainStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  multiSet?(pairs: [string, string][]): Promise<void>;
};

const GUEST_DATASET_KEY = 'guest_dataset_id';

function matchingFoodId(snapshot: WebSnapshotState, aggregate: SyncAggregate): string | null {
  if (aggregate.type !== 'food') {
    return null;
  }
  const { food } = aggregate;
  const match = snapshot.library.foods.find(
    (candidate) =>
      candidate.id !== food.id &&
      candidate.name.trim().toLowerCase() === food.name.trim().toLowerCase() &&
      candidate.serving.unit === food.serving.unit &&
      candidate.serving.amount === food.serving.amount &&
      candidate.nutrition.calories === food.nutrition.calories &&
      candidate.nutrition.protein === food.nutrition.protein &&
      candidate.nutrition.carbs === food.nutrition.carbs &&
      candidate.nutrition.fat === food.nutrition.fat,
  );
  return match?.id ?? null;
}

function remapFoodReferences(aggregate: SyncAggregate, mapping: ReadonlyMap<string, string>): SyncAggregate {
  if (mapping.size === 0) {
    return aggregate;
  }
  const mapId = (id: string | null): string | null => (id === null ? null : (mapping.get(id) ?? id));
  switch (aggregate.type) {
    case 'meal': {
      if (aggregate.source === null) {
        return aggregate;
      }
      const source = aggregate.source;
      return source.sourceType === 'ai'
        ? { ...aggregate, source: { ...source, matchedFoodId: mapId(source.matchedFoodId) } }
        : { ...aggregate, source: { ...source, foodId: mapId(source.foodId) } };
    }
    case 'saved_meal':
      return {
        ...aggregate,
        savedMeal: { ...aggregate.savedMeal, items: aggregate.savedMeal.items.map((item) => ({ ...item, foodId: mapId(item.foodId) })) },
      };
    case 'recipe':
      return {
        ...aggregate,
        recipe: { ...aggregate.recipe, ingredients: aggregate.recipe.ingredients.map((item) => ({ ...item, foodId: mapId(item.foodId) })) },
      };
    default:
      return aggregate;
  }
}

export function createWebGuestImportService({
  storage,
  getAccountKey,
  generateId = createId,
  now = () => new Date(),
}: {
  storage: PlainStorage;
  getAccountKey: () => string | null;
  generateId?: () => string;
  now?: () => Date;
}) {
  const accountKeyFor = (key: string): string => {
    const accountKey = getAccountKey();
    if (accountKey === null) {
      throw new GuestImportError('write_failed', 'Sign in before importing this device data.');
    }
    return `${accountStoragePrefix(accountKey)}${key}`;
  };

  const readSnapshot = async (prefix: (key: string) => string): Promise<WebSnapshotState> =>
    readSnapshotFrom({
      meals: await storage.getItem(prefix(ASYNC_STORAGE_MEALS_KEY)),
      library: await storage.getItem(prefix(LIBRARY_STORAGE_KEY)),
      links: await storage.getItem(prefix(FOOD_BARCODE_LINKS_STORAGE_KEY)),
      plan: await storage.getItem(prefix(NUTRITION_PLAN_STORAGE_KEY)),
    });

  const readDatasetId = async (): Promise<string> => {
    const existing = await storage.getItem(GUEST_DATASET_KEY);
    if (existing !== null && existing.length > 0) {
      return existing;
    }
    const datasetId = generateId();
    await storage.setItem(GUEST_DATASET_KEY, datasetId);
    return datasetId;
  };

  const readDecision = async (datasetId: string): Promise<GuestImportDecision | null> => {
    const raw = await storage.getItem(accountKeyFor(GUEST_IMPORT_RECORD_KEY));
    if (raw === null) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      const record = parsed as Record<string, GuestImportDecision> | null;
      return record?.[datasetId] ?? null;
    } catch {
      return null;
    }
  };

  const recordDecision = async (datasetId: string, status: GuestImportDecision): Promise<void> => {
    const key = accountKeyFor(GUEST_IMPORT_RECORD_KEY);
    const raw = await storage.getItem(key);
    let record: Record<string, unknown> = {};
    try {
      const parsed: unknown = raw === null ? {} : JSON.parse(raw);
      record = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      record = {};
    }
    await storage.setItem(key, JSON.stringify({ ...record, [datasetId]: status, updatedAt: now().toISOString() }));
  };

  const countsOf = (snapshot: WebSnapshotState): GuestDataCounts => {
    const counts: GuestDataCounts = { ...EMPTY_COUNTS };
    for (const entity of listSnapshotEntities(snapshot)) {
      counts[COUNT_KEYS[entity.entityType]] += 1;
    }
    return counts;
  };

  return {
    describeGuestData: async (): Promise<{ datasetId: string; counts: GuestDataCounts; decision: GuestImportDecision | null }> => {
      const datasetId = await readDatasetId();
      const guest = await readSnapshot((key) => key);
      return { datasetId, counts: countsOf(guest), decision: await readDecision(datasetId) };
    },

    decline: async (datasetId: string) => recordDecision(datasetId, 'declined'),

    decideLater: async (datasetId: string) => recordDecision(datasetId, 'deferred'),

    importGuestData: async ({ onProgress }: GuestImportOptions = {}): Promise<GuestImportSummary> => {
      const datasetId = await readDatasetId();
      const guest = await readSnapshot((key) => key);
      let account = await readSnapshot(accountKeyFor);
      const imported: GuestDataCounts = { ...EMPTY_COUNTS };
      const alreadyPresent: GuestDataCounts = { ...EMPTY_COUNTS };
      const foodMapping = new Map<string, string>();
      await recordDecision(datasetId, 'in_progress');

      for (const entityType of IMPORT_ORDER) {
        const entities = listSnapshotEntities(guest).filter((entity) => entity.entityType === entityType);
        onProgress?.({ entityType, completed: 0, total: entities.length });
        let completed = 0;
        for (const { entityId } of entities) {
          const guestAggregate = readAggregateFromSnapshot(guest, entityType, entityId);
          completed += 1;
          if (guestAggregate === null) {
            onProgress?.({ entityType, completed, total: entities.length });
            continue;
          }
          if (readAggregateFromSnapshot(account, entityType, entityId) !== null) {
            alreadyPresent[COUNT_KEYS[entityType]] += 1;
            onProgress?.({ entityType, completed, total: entities.length });
            continue;
          }
          const matched = matchingFoodId(account, guestAggregate);
          if (matched !== null) {
            foodMapping.set(entityId, matched);
            alreadyPresent[COUNT_KEYS[entityType]] += 1;
            onProgress?.({ entityType, completed, total: entities.length });
            continue;
          }
          account = applyAggregateToSnapshot(account, remapFoodReferences(guestAggregate, foodMapping));
          imported[COUNT_KEYS[entityType]] += 1;
          onProgress?.({ entityType, completed, total: entities.length });
        }
      }

      const pairs: [string, string][] = [
        [accountKeyFor(ASYNC_STORAGE_MEALS_KEY), JSON.stringify(account.mealRecords)],
        [accountKeyFor(LIBRARY_STORAGE_KEY), serializeLibrary(account.library)],
        [accountKeyFor(FOOD_BARCODE_LINKS_STORAGE_KEY), serializeLinks(account.linkRecords)],
        [accountKeyFor(NUTRITION_PLAN_STORAGE_KEY), serializePlan(account.plan)],
      ];
      try {
        if (storage.multiSet) {
          await storage.multiSet(pairs);
        } else {
          for (const [key, value] of pairs) {
            await storage.setItem(key, value);
          }
        }
      } catch (error) {
        throw new GuestImportError('write_failed', 'Could not copy this device data into your account.', { cause: error });
      }
      await recordDecision(datasetId, 'completed');
      return { datasetId, imported, alreadyPresent, matchedExistingFoods: foodMapping.size };
    },
  };
}
