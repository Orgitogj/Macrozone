import {
  COUNT_KEYS,
  EMPTY_COUNTS,
  IMPORT_ORDER,
  findMatchingFoodId,
  remapFoodReferences,
  type GuestDataCounts,
  type GuestImportProgress,
} from '@/features/account/services/guestImportService';
import { listAggregateIds, readAggregate, writeAggregate } from '@/features/sync/repositories/sqliteAggregateStore';
import { encodeAggregate, sameContent } from '@/features/sync/utils/aggregatePayload';
import { copyAggregateAsNewEntity } from '@/features/sync/utils/duplicateAggregate';
import type { SyncAggregate, SyncEntityType } from '@/features/sync/types';
import type { SqlDatabase, SqlExecutor } from '@/storage/database/types';
import { createId } from '@/utils/id';

export type AccountCopyStatus = 'in_progress' | 'completed';

export type AccountCopySummary = {
  datasetId: string;
  copied: GuestDataCounts;
  alreadyPresent: GuestDataCounts;
  duplicated: GuestDataCounts;
  keptGuestVersion: GuestDataCounts;
  verifiedEntities: number;
};

export type AccountCopyOptions = { onProgress?: (progress: GuestImportProgress) => void };

export class AccountCopyError extends Error {
  readonly code: 'read_failed' | 'write_failed' | 'verification_failed';

  constructor(code: 'read_failed' | 'write_failed' | 'verification_failed', message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AccountCopyError';
    this.code = code;
  }
}

type CopyRecord = { counts: AccountCopySummary; map: Record<string, string> };

type SourceEntity = { entityType: SyncEntityType; entityId: string; aggregate: SyncAggregate };

export function accountCopyDatasetId(accountKey: string): string {
  const hex = accountKey.toLowerCase().replace(/[^0-9a-f]/g, '').padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const READ_FAILED = 'MacroZone could not read this account data on this device.';
const WRITE_FAILED = 'MacroZone could not copy this account data into the data stored on this device.';
const VERIFY_FAILED = 'MacroZone could not confirm the copy on this device, so nothing was deleted.';

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

export function totalCopied(summary: AccountCopySummary): number {
  const counts = summary.copied;
  return counts.meals + counts.foods + counts.savedMeals + counts.recipes + counts.nutritionPlan;
}

export function createAccountToGuestCopyService({
  openGuestDatabase,
  getAccountDatabase,
  getAccountKey,
  generateId = createId,
  now = () => new Date(),
}: {
  openGuestDatabase: () => Promise<SqlDatabase>;
  getAccountDatabase: () => Promise<SqlDatabase>;
  getAccountKey: () => string | null;
  generateId?: () => string;
  now?: () => Date;
}) {
  const datasetIdFor = (): string => {
    const accountKey = getAccountKey();
    if (accountKey === null) {
      throw new AccountCopyError('read_failed', 'Sign in before copying account data to this device.');
    }
    return accountCopyDatasetId(accountKey);
  };

  const readRecord = async (guest: SqlExecutor, datasetId: string): Promise<{ status: AccountCopyStatus | null; record: CopyRecord }> => {
    const row = await guest.getFirstAsync<{ status: AccountCopyStatus; counts_json: string | null }>(
      'SELECT status, counts_json FROM imported_guest_datasets WHERE dataset_id = ?',
      [datasetId],
    );
    if (row === null) {
      return { status: null, record: { counts: emptySummary(datasetId), map: {} } };
    }
    try {
      const parsed: unknown = row.counts_json === null ? null : JSON.parse(row.counts_json);
      if (typeof parsed === 'object' && parsed !== null && 'counts' in parsed && 'map' in parsed) {
        return { status: row.status, record: parsed as CopyRecord };
      }
    } catch {
      return { status: row.status, record: { counts: emptySummary(datasetId), map: {} } };
    }
    return { status: row.status, record: { counts: emptySummary(datasetId), map: {} } };
  };

  const writeRecord = async (
    executor: SqlExecutor,
    datasetId: string,
    status: AccountCopyStatus,
    record: CopyRecord,
  ): Promise<void> => {
    const timestamp = now().toISOString();
    await executor.runAsync(
      `INSERT INTO imported_guest_datasets (dataset_id, status, counts_json, started_at, completed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (dataset_id) DO UPDATE SET status = excluded.status, counts_json = excluded.counts_json,
         completed_at = COALESCE(excluded.completed_at, imported_guest_datasets.completed_at), updated_at = excluded.updated_at`,
      [datasetId, status, JSON.stringify(record), timestamp, status === 'completed' ? timestamp : null, timestamp],
    );
  };

  const readSnapshot = async (): Promise<SourceEntity[]> => {
    const account = await getAccountDatabase();
    const entities: SourceEntity[] = [];
    try {
      await account.withExclusiveTransactionAsync(async (transaction) => {
        for (const entityType of IMPORT_ORDER) {
          for (const entityId of await listAggregateIds(transaction, entityType)) {
            const aggregate = await readAggregate(transaction, entityType, entityId);
            if (aggregate !== null) {
              entities.push({ entityType, entityId, aggregate });
            }
          }
        }
      });
    } catch (error) {
      throw new AccountCopyError('read_failed', READ_FAILED, { cause: error });
    }
    return entities;
  };

  return {
    describeAccountData: async (): Promise<{ datasetId: string; counts: GuestDataCounts; status: AccountCopyStatus | null }> => {
      const datasetId = datasetIdFor();
      const account = await getAccountDatabase();
      const counts: GuestDataCounts = { ...EMPTY_COUNTS };
      try {
        for (const entityType of IMPORT_ORDER) {
          counts[COUNT_KEYS[entityType]] = (await listAggregateIds(account, entityType)).length;
        }
      } catch (error) {
        throw new AccountCopyError('read_failed', READ_FAILED, { cause: error });
      }
      const guest = await openGuestDatabase();
      const { status } = await readRecord(guest, datasetId);
      return { datasetId, counts, status };
    },

    copyToGuest: async ({ onProgress }: AccountCopyOptions = {}): Promise<AccountCopySummary> => {
      const datasetId = datasetIdFor();
      const guest = await openGuestDatabase();
      const existing = await readRecord(guest, datasetId);
      if (existing.status === 'completed') {
        return existing.record.counts;
      }

      const snapshot = await readSnapshot();
      const record: CopyRecord = { counts: { ...existing.record.counts, datasetId }, map: { ...existing.record.map } };
      const mapping = new Map<string, string>(Object.entries(record.map));
      const timestamp = now().toISOString();

      for (const entityType of IMPORT_ORDER) {
        const entities = snapshot.filter((entity) => entity.entityType === entityType);
        onProgress?.({ entityType, completed: 0, total: entities.length });
        let completed = 0;
        for (const { entityId, aggregate } of entities) {
          try {
            await guest.withExclusiveTransactionAsync(async (transaction) => {
              const mapped = mapping.get(entityId);
              if (mapped !== undefined && (await readAggregate(transaction, entityType, mapped)) !== null) {
                return;
              }
              const source = remapFoodReferences(aggregate, mapping);
              const current = await readAggregate(transaction, entityType, entityId);
              if (current !== null) {
                if (sameContent(encodeAggregate(current), encodeAggregate(source))) {
                  mapping.set(entityId, entityId);
                  record.counts.alreadyPresent[COUNT_KEYS[entityType]] += 1;
                } else if (entityType === 'nutrition_plan') {
                  mapping.set(entityId, entityId);
                  record.counts.keptGuestVersion[COUNT_KEYS[entityType]] += 1;
                } else {
                  const copy = copyAggregateAsNewEntity(source, generateId, timestamp);
                  if (copy === null) {
                    mapping.set(entityId, entityId);
                    record.counts.keptGuestVersion[COUNT_KEYS[entityType]] += 1;
                  } else {
                    await writeAggregate(transaction, copy);
                    mapping.set(entityId, copy.id);
                    record.counts.duplicated[COUNT_KEYS[entityType]] += 1;
                  }
                }
              } else {
                const matchedFoodId = await findMatchingFoodId(transaction, source);
                if (matchedFoodId !== null) {
                  mapping.set(entityId, matchedFoodId);
                  record.counts.alreadyPresent[COUNT_KEYS[entityType]] += 1;
                } else {
                  await writeAggregate(transaction, source);
                  mapping.set(entityId, entityId);
                  record.counts.copied[COUNT_KEYS[entityType]] += 1;
                }
              }
              record.map = Object.fromEntries(mapping);
              await writeRecord(transaction, datasetId, 'in_progress', record);
            });
          } catch (error) {
            throw new AccountCopyError('write_failed', WRITE_FAILED, { cause: error });
          }
          completed += 1;
          onProgress?.({ entityType, completed, total: entities.length });
        }
      }

      let verified = 0;
      for (const { entityType, entityId } of snapshot) {
        const target = mapping.get(entityId);
        if (target === undefined || (await readAggregate(guest, entityType, target)) === null) {
          throw new AccountCopyError('verification_failed', VERIFY_FAILED);
        }
        verified += 1;
      }
      record.counts.verifiedEntities = verified;
      record.map = Object.fromEntries(mapping);
      await writeRecord(guest, datasetId, 'completed', record);
      return record.counts;
    },
  };
}

export type AccountToGuestCopyService = ReturnType<typeof createAccountToGuestCopyService>;
