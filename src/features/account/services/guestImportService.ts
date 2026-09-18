import { readAggregate, listAggregateIds, writeAggregate } from '@/features/sync/repositories/sqliteAggregateStore';
import { encodeAggregate, samePayload } from '@/features/sync/utils/aggregatePayload';
import { SYNC_ENTITY_TYPES, type SyncEntityType } from '@/storage/database/syncSchema';
import type { SqlDatabase, SqlExecutor } from '@/storage/database/types';
import type { SyncAggregate } from '@/features/sync/types';
import { createId } from '@/utils/id';

export type GuestDataCounts = {
  meals: number;
  foods: number;
  savedMeals: number;
  recipes: number;
  nutritionPlan: number;
};

export type GuestImportDecision = 'declined' | 'deferred' | 'in_progress' | 'completed';

export type GuestImportProgress = {
  entityType: SyncEntityType;
  completed: number;
  total: number;
};

export type GuestImportOptions = { onProgress?: (progress: GuestImportProgress) => void };

export type GuestImportSummary = {
  datasetId: string;
  imported: GuestDataCounts;
  alreadyPresent: GuestDataCounts;
  matchedExistingFoods: number;
};

export class GuestImportError extends Error {
  readonly code: 'read_failed' | 'write_failed';

  constructor(code: 'read_failed' | 'write_failed', message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'GuestImportError';
    this.code = code;
  }
}

export const EMPTY_COUNTS: GuestDataCounts = { meals: 0, foods: 0, savedMeals: 0, recipes: 0, nutritionPlan: 0 };

export const IMPORT_ORDER: readonly SyncEntityType[] = ['food', 'saved_meal', 'recipe', 'meal', 'nutrition_plan'];

export const COUNT_KEYS: Record<SyncEntityType, keyof GuestDataCounts> = {
  meal: 'meals',
  food: 'foods',
  saved_meal: 'savedMeals',
  recipe: 'recipes',
  nutrition_plan: 'nutritionPlan',
};

export async function readGuestDatasetId(guest: SqlDatabase, generateId: () => string = createId): Promise<string> {
  const row = await guest.getFirstAsync<{ guest_dataset_id: string | null }>(
    'SELECT guest_dataset_id FROM account_database_metadata WHERE id = 1',
    [],
  );
  if (row?.guest_dataset_id) {
    return row.guest_dataset_id;
  }
  const datasetId = generateId();
  await guest.runAsync('UPDATE account_database_metadata SET guest_dataset_id = ? WHERE id = 1', [datasetId]);
  return datasetId;
}

export async function countGuestData(guest: SqlDatabase): Promise<GuestDataCounts> {
  try {
    const counts: GuestDataCounts = { ...EMPTY_COUNTS };
    for (const entityType of SYNC_ENTITY_TYPES) {
      counts[COUNT_KEYS[entityType]] = (await listAggregateIds(guest, entityType)).length;
    }
    return counts;
  } catch (error) {
    throw new GuestImportError('read_failed', 'Could not read the data already on this device.', { cause: error });
  }
}

export async function findMatchingFoodId(executor: SqlExecutor, aggregate: SyncAggregate): Promise<string | null> {
  if (aggregate.type !== 'food') {
    return null;
  }
  const { food } = aggregate;
  const row = await executor.getFirstAsync<{ id: string }>(
    `SELECT id FROM foods
     WHERE name_key = lower(?) AND serving_unit = ? AND serving_amount = ? AND calories = ? AND protein = ? AND carbs = ? AND fat = ?
     LIMIT 1`,
    [
      food.name.trim(),
      food.serving.unit,
      food.serving.amount,
      food.nutrition.calories,
      food.nutrition.protein,
      food.nutrition.carbs,
      food.nutrition.fat,
    ],
  );
  return row?.id ?? null;
}

export function remapFoodReferences(aggregate: SyncAggregate, mapping: ReadonlyMap<string, string>): SyncAggregate {
  if (mapping.size === 0) {
    return aggregate;
  }
  const mapId = (id: string | null): string | null => (id === null ? null : (mapping.get(id) ?? id));
  switch (aggregate.type) {
    case 'meal': {
      const source = aggregate.source;
      if (source === null) {
        return aggregate;
      }
      if (source.sourceType === 'ai') {
        return { ...aggregate, source: { ...source, matchedFoodId: mapId(source.matchedFoodId) } };
      }
      return { ...aggregate, source: { ...source, foodId: mapId(source.foodId) } };
    }
    case 'saved_meal':
      return {
        ...aggregate,
        savedMeal: { ...aggregate.savedMeal, items: aggregate.savedMeal.items.map((item) => ({ ...item, foodId: mapId(item.foodId) })) },
      };
    case 'recipe':
      return {
        ...aggregate,
        recipe: {
          ...aggregate.recipe,
          ingredients: aggregate.recipe.ingredients.map((item) => ({ ...item, foodId: mapId(item.foodId) })),
        },
      };
    default:
      return aggregate;
  }
}

export function createGuestImportService({
  openGuestDatabase,
  getAccountDatabase,
  generateId = createId,
  now = () => new Date(),
}: {
  openGuestDatabase: () => Promise<SqlDatabase>;
  getAccountDatabase: () => Promise<SqlDatabase>;
  generateId?: () => string;
  now?: () => Date;
}) {
  const readDecision = async (datasetId: string): Promise<GuestImportDecision | null> => {
    const account = await getAccountDatabase();
    const row = await account.getFirstAsync<{ status: GuestImportDecision }>(
      'SELECT status FROM imported_guest_datasets WHERE dataset_id = ?',
      [datasetId],
    );
    return row?.status ?? null;
  };

  const recordDecision = async (datasetId: string, status: GuestImportDecision, counts?: GuestDataCounts): Promise<void> => {
    const account = await getAccountDatabase();
    const timestamp = now().toISOString();
    await account.runAsync(
      `INSERT INTO imported_guest_datasets (dataset_id, status, counts_json, started_at, completed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (dataset_id) DO UPDATE SET status = excluded.status,
         counts_json = COALESCE(excluded.counts_json, imported_guest_datasets.counts_json),
         started_at = COALESCE(imported_guest_datasets.started_at, excluded.started_at),
         completed_at = excluded.completed_at,
         updated_at = excluded.updated_at`,
      [
        datasetId,
        status,
        counts === undefined ? null : JSON.stringify(counts),
        status === 'in_progress' ? timestamp : null,
        status === 'completed' ? timestamp : null,
        timestamp,
      ],
    );
  };

  return {
    describeGuestData: async (): Promise<{ datasetId: string; counts: GuestDataCounts; decision: GuestImportDecision | null }> => {
      const guest = await openGuestDatabase();
      const datasetId = await readGuestDatasetId(guest, generateId);
      return { datasetId, counts: await countGuestData(guest), decision: await readDecision(datasetId) };
    },

    decline: async (datasetId: string): Promise<void> => {
      await recordDecision(datasetId, 'declined');
    },

    decideLater: async (datasetId: string): Promise<void> => {
      await recordDecision(datasetId, 'deferred');
    },

    importGuestData: async ({ onProgress }: GuestImportOptions = {}): Promise<GuestImportSummary> => {
      const guest = await openGuestDatabase();
      const datasetId = await readGuestDatasetId(guest, generateId);
      const imported: GuestDataCounts = { ...EMPTY_COUNTS };
      const alreadyPresent: GuestDataCounts = { ...EMPTY_COUNTS };
      const foodMapping = new Map<string, string>();
      await recordDecision(datasetId, 'in_progress');

      for (const entityType of IMPORT_ORDER) {
        let ids: string[];
        try {
          ids = await listAggregateIds(guest, entityType);
        } catch (error) {
          throw new GuestImportError('read_failed', 'Could not read the data already on this device.', { cause: error });
        }
        onProgress?.({ entityType, completed: 0, total: ids.length });
        let completed = 0;
        for (const entityId of ids) {
          const account = await getAccountDatabase();
          let guestAggregate: SyncAggregate | null;
          try {
            guestAggregate = await readAggregate(guest, entityType, entityId);
          } catch (error) {
            throw new GuestImportError('read_failed', 'Could not read the data already on this device.', { cause: error });
          }
          if (guestAggregate === null) {
            continue;
          }
          try {
            await account.withExclusiveTransactionAsync(async (transaction) => {
              const existing = await readAggregate(transaction, entityType, entityId);
              if (existing !== null) {
                if (!samePayload(encodeAggregate(existing), encodeAggregate(guestAggregate))) {
                  alreadyPresent[COUNT_KEYS[entityType]] += 1;
                } else {
                  alreadyPresent[COUNT_KEYS[entityType]] += 1;
                }
                return;
              }
              const matchedFoodId = await findMatchingFoodId(transaction, guestAggregate);
              if (matchedFoodId !== null) {
                foodMapping.set(entityId, matchedFoodId);
                alreadyPresent[COUNT_KEYS[entityType]] += 1;
                return;
              }
              await writeAggregate(transaction, remapFoodReferences(guestAggregate, foodMapping));
              imported[COUNT_KEYS[entityType]] += 1;
            });
          } catch (error) {
            throw new GuestImportError('write_failed', 'Could not copy this device data into your account.', { cause: error });
          }
          completed += 1;
          onProgress?.({ entityType, completed, total: ids.length });
        }
      }

      await recordDecision(datasetId, 'completed', imported);
      return { datasetId, imported, alreadyPresent, matchedExistingFoods: foodMapping.size };
    },
  };
}

export type GuestImportService = ReturnType<typeof createGuestImportService>;
