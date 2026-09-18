import { accountStoragePrefix } from '@/features/account/utils/accountKey';
import {
  AccountCopyError,
  accountCopyDatasetId,
  type AccountCopyOptions,
  type AccountCopyStatus,
  type AccountCopySummary,
} from '@/features/account/services/accountToGuestCopyService';
import {
  COUNT_KEYS,
  EMPTY_COUNTS,
  IMPORT_ORDER,
  remapFoodReferences,
  type GuestDataCounts,
} from '@/features/account/services/guestImportService';
import { FOOD_BARCODE_LINKS_STORAGE_KEY } from '@/features/barcode/repositories/asyncStorageBarcodeRepositories';
import { LIBRARY_STORAGE_KEY } from '@/features/library/repositories/asyncStorageLibraryRepositories';
import { ASYNC_STORAGE_MEALS_KEY } from '@/features/meals/repositories/asyncStorageMealRepository';
import { NUTRITION_PLAN_STORAGE_KEY } from '@/features/nutrition-goals/repositories/asyncStorageNutritionPlanRepository';
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
import { encodeAggregate, sameContent } from '@/features/sync/utils/aggregatePayload';
import { copyAggregateAsNewEntity } from '@/features/sync/utils/duplicateAggregate';
import type { SyncAggregate } from '@/features/sync/types';
import { createId } from '@/utils/id';
import { createSerialQueue, type SerialQueue } from '@/utils/serialQueue';

export const ACCOUNT_COPY_RECORD_KEY = 'account_copy';

type PlainStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiSet?(pairs: [string, string][]): Promise<void>;
};

type CopyRecord = { status: AccountCopyStatus; counts: AccountCopySummary; map: Record<string, string> };

const COPY_KEYS = [ASYNC_STORAGE_MEALS_KEY, LIBRARY_STORAGE_KEY, FOOD_BARCODE_LINKS_STORAGE_KEY, NUTRITION_PLAN_STORAGE_KEY];

const RESTORE_FAILED =
  'MacroZone could not copy your account data and could not fully restore the data already on this device. Nothing was deleted. Close and reopen MacroZone before trying again.';

function emptySummary(datasetId: string): AccountCopySummary {
  return {
    datasetId,
    copied: { ...EMPTY_COUNTS },
    alreadyPresent: { ...EMPTY_COUNTS },
    duplicated: { ...EMPTY_COUNTS },
    keptGuestVersion: { ...EMPTY_COUNTS },
    verifiedEntities: 0,
  };
}

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

export function createWebAccountToGuestCopyService({
  storage,
  getAccountKey,
  generateId = createId,
  now = () => new Date(),
  queue = createSerialQueue(),
}: {
  storage: PlainStorage;
  getAccountKey: () => string | null;
  generateId?: () => string;
  now?: () => Date;
  queue?: SerialQueue;
}) {
  const requireAccountKey = (): string => {
    const accountKey = getAccountKey();
    if (accountKey === null) {
      throw new AccountCopyError('read_failed', 'Sign in before copying account data to this device.');
    }
    return accountKey;
  };

  const readSnapshot = async (prefix: (key: string) => string): Promise<WebSnapshotState> =>
    readSnapshotFrom({
      meals: await storage.getItem(prefix(ASYNC_STORAGE_MEALS_KEY)),
      library: await storage.getItem(prefix(LIBRARY_STORAGE_KEY)),
      links: await storage.getItem(prefix(FOOD_BARCODE_LINKS_STORAGE_KEY)),
      plan: await storage.getItem(prefix(NUTRITION_PLAN_STORAGE_KEY)),
    });

  const readRecord = async (datasetId: string): Promise<CopyRecord | null> => {
    const raw = await storage.getItem(ACCOUNT_COPY_RECORD_KEY);
    if (raw === null) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      const record = (parsed as Record<string, CopyRecord | undefined>)[datasetId];
      return record ?? null;
    } catch {
      return null;
    }
  };

  const writeRecord = async (datasetId: string, record: CopyRecord): Promise<void> => {
    const raw = await storage.getItem(ACCOUNT_COPY_RECORD_KEY);
    let all: Record<string, unknown> = {};
    try {
      const parsed: unknown = raw === null ? {} : JSON.parse(raw);
      all = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      all = {};
    }
    await storage.setItem(ACCOUNT_COPY_RECORD_KEY, JSON.stringify({ ...all, [datasetId]: record, updatedAt: now().toISOString() }));
  };

  const serialize = (snapshot: WebSnapshotState): [string, string][] => [
    [ASYNC_STORAGE_MEALS_KEY, JSON.stringify(snapshot.mealRecords)],
    [LIBRARY_STORAGE_KEY, serializeLibrary(snapshot.library)],
    [FOOD_BARCODE_LINKS_STORAGE_KEY, serializeLinks(snapshot.linkRecords)],
    [NUTRITION_PLAN_STORAGE_KEY, serializePlan(snapshot.plan)],
  ];

  const restore = async (previous: Record<string, string | null>): Promise<boolean> => {
    try {
      for (const key of COPY_KEYS) {
        const value = previous[key];
        if (value === null) {
          await storage.removeItem(key);
        } else {
          await storage.setItem(key, value);
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  return {
    describeAccountData: async (): Promise<{ datasetId: string; counts: GuestDataCounts; status: AccountCopyStatus | null }> => {
      const accountKey = requireAccountKey();
      const datasetId = accountCopyDatasetId(accountKey);
      const prefix = accountStoragePrefix(accountKey);
      const account = await readSnapshot((key) => `${prefix}${key}`);
      const counts: GuestDataCounts = { ...EMPTY_COUNTS };
      for (const entity of listSnapshotEntities(account)) {
        counts[COUNT_KEYS[entity.entityType]] += 1;
      }
      return { datasetId, counts, status: (await readRecord(datasetId))?.status ?? null };
    },

    copyToGuest: ({ onProgress }: AccountCopyOptions = {}): Promise<AccountCopySummary> =>
      queue.run(async () => {
        const accountKey = requireAccountKey();
        const datasetId = accountCopyDatasetId(accountKey);
        const existing = await readRecord(datasetId);
        if (existing?.status === 'completed') {
          return existing.counts;
        }
        const prefix = accountStoragePrefix(accountKey);
        const account = await readSnapshot((key) => `${prefix}${key}`);
        let guest = await readSnapshot((key) => key);
        const previous: Record<string, string | null> = {};
        for (const key of COPY_KEYS) {
          previous[key] = await storage.getItem(key);
        }

        const counts = emptySummary(datasetId);
        const mapping = new Map<string, string>();
        const timestamp = now().toISOString();

        for (const entityType of IMPORT_ORDER) {
          const entities = listSnapshotEntities(account).filter((entity) => entity.entityType === entityType);
          onProgress?.({ entityType, completed: 0, total: entities.length });
          let completed = 0;
          for (const { entityId } of entities) {
            const sourceAggregate = readAggregateFromSnapshot(account, entityType, entityId);
            completed += 1;
            if (sourceAggregate === null) {
              onProgress?.({ entityType, completed, total: entities.length });
              continue;
            }
            const source = remapFoodReferences(sourceAggregate, mapping);
            const current = readAggregateFromSnapshot(guest, entityType, entityId);
            if (current !== null) {
              if (sameContent(encodeAggregate(current), encodeAggregate(source))) {
                mapping.set(entityId, entityId);
                counts.alreadyPresent[COUNT_KEYS[entityType]] += 1;
              } else if (entityType === 'nutrition_plan') {
                mapping.set(entityId, entityId);
                counts.keptGuestVersion[COUNT_KEYS[entityType]] += 1;
              } else {
                const copy = copyAggregateAsNewEntity(source, generateId, timestamp);
                if (copy === null) {
                  mapping.set(entityId, entityId);
                  counts.keptGuestVersion[COUNT_KEYS[entityType]] += 1;
                } else {
                  guest = applyAggregateToSnapshot(guest, copy);
                  mapping.set(entityId, copy.id);
                  counts.duplicated[COUNT_KEYS[entityType]] += 1;
                }
              }
            } else {
              const matched = matchingFoodId(guest, source);
              if (matched !== null) {
                mapping.set(entityId, matched);
                counts.alreadyPresent[COUNT_KEYS[entityType]] += 1;
              } else {
                guest = applyAggregateToSnapshot(guest, source);
                mapping.set(entityId, entityId);
                counts.copied[COUNT_KEYS[entityType]] += 1;
              }
            }
            onProgress?.({ entityType, completed, total: entities.length });
          }
        }

        try {
          const pairs = serialize(guest);
          if (storage.multiSet) {
            await storage.multiSet(pairs);
          } else {
            for (const [key, value] of pairs) {
              await storage.setItem(key, value);
            }
          }
        } catch (error) {
          const restored = await restore(previous);
          throw new AccountCopyError(
            'write_failed',
            restored ? 'MacroZone could not copy your account data to this device, so nothing was deleted.' : RESTORE_FAILED,
            { cause: error },
          );
        }

        const written = await readSnapshot((key) => key);
        let verified = 0;
        for (const entity of listSnapshotEntities(account)) {
          const target = mapping.get(entity.entityId);
          if (target === undefined || readAggregateFromSnapshot(written, entity.entityType, target) === null) {
            await restore(previous);
            throw new AccountCopyError('verification_failed', 'MacroZone could not confirm the copy on this device, so nothing was deleted.');
          }
          verified += 1;
        }
        counts.verifiedEntities = verified;
        await writeRecord(datasetId, { status: 'completed', counts, map: Object.fromEntries(mapping) });
        return counts;
      }),
  };
}
