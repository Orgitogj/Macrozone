import AsyncStorage from '@react-native-async-storage/async-storage';

import { FOOD_BARCODE_LINKS_STORAGE_KEY } from '@/features/barcode/repositories/asyncStorageBarcodeRepositories';
import { LIBRARY_STORAGE_KEY } from '@/features/library/repositories/asyncStorageLibraryRepositories';
import { ASYNC_STORAGE_MEALS_KEY } from '@/features/meals/repositories/asyncStorageMealRepository';
import { NUTRITION_PLAN_STORAGE_KEY } from '@/features/nutrition-goals/repositories/asyncStorageNutritionPlanRepository';
import {
  applyAggregateToSnapshot,
  listSnapshotEntities,
  readAggregateFromSnapshot,
  readSnapshotFrom,
  removeEntityFromSnapshot,
  serializeLibrary,
  serializeLinks,
  serializePlan,
  WEB_SYNC_STATE_KEY,
  type WebSnapshotState,
} from '@/features/sync/repositories/webAggregateStore';
import {
  decodeAggregate,
  encodeAggregate,
  payloadHash,
  sameContent,
  samePayload,
} from '@/features/sync/utils/aggregatePayload';
import { copyAggregateAsNewEntity } from '@/features/sync/utils/duplicateAggregate';
import {
  SyncError,
  type AcknowledgementOutcome,
  type LocalSyncStore,
  type PullApplyOutcome,
  type SealedOperation,
  type SyncConflict,
  type SyncConflictReason,
  type SyncConflictResolution,
  type SyncEntityType,
  type SyncPullPage,
  type SyncPushResult,
} from '@/features/sync/types';
import { SYNC_PAYLOAD_VERSION } from '@/storage/database/syncSchema';
import { createId } from '@/utils/id';
import { createSerialQueue, type SerialQueue } from '@/utils/serialQueue';

export type WebSyncStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiSet?(pairs: [string, string][]): Promise<void>;
};

type StoredRevision = { revision: number; deleted: boolean; hash: string };

type StoredOperation = {
  operationId: string;
  entityType: SyncEntityType;
  entityId: string;
  kind: 'upsert' | 'delete';
  baseRevision: number;
  payload: Record<string, unknown> | null;
  attemptCount: number;
  nextAttemptAt: string | null;
  blocked: boolean;
};

type StoredConflict = SyncConflict & { status: 'open' | 'resolved' };

type WebSyncState = {
  version: 1;
  cursor: number;
  revisions: Record<string, StoredRevision>;
  operations: StoredOperation[];
  conflicts: StoredConflict[];
  lastSuccessAt: string | null;
  lastErrorCode: string | null;
  blockedReason: string | null;
};

const EMPTY_STATE: WebSyncState = {
  version: 1,
  cursor: 0,
  revisions: {},
  operations: [],
  conflicts: [],
  lastSuccessAt: null,
  lastErrorCode: null,
  blockedReason: null,
};

const entityKey = (entityType: SyncEntityType, entityId: string) => `${entityType}:${entityId}`;

function parseState(raw: string | null): WebSyncState {
  if (raw === null) {
    return { ...EMPTY_STATE };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...EMPTY_STATE };
    }
    const state = parsed as Partial<WebSyncState>;
    if (state.version !== 1) {
      throw new SyncError('unsupported_payload', 'This device has sync data from a newer version of MacroZone.');
    }
    return {
      version: 1,
      cursor: typeof state.cursor === 'number' ? state.cursor : 0,
      revisions: state.revisions ?? {},
      operations: state.operations ?? [],
      conflicts: state.conflicts ?? [],
      lastSuccessAt: state.lastSuccessAt ?? null,
      lastErrorCode: state.lastErrorCode ?? null,
      blockedReason: state.blockedReason ?? null,
    };
  } catch (error) {
    if (error instanceof SyncError) {
      throw error;
    }
    return { ...EMPTY_STATE };
  }
}

export function createWebLocalSyncStore({
  accountKey,
  storage = AsyncStorage as WebSyncStorage,
  queue = createSerialQueue(),
  generateId = createId,
}: {
  accountKey: string;
  storage?: WebSyncStorage;
  queue?: SerialQueue;
  generateId?: () => string;
}): LocalSyncStore {
  const readValues = async () => {
    const [meals, library, links, plan, state] = await Promise.all([
      storage.getItem(ASYNC_STORAGE_MEALS_KEY),
      storage.getItem(LIBRARY_STORAGE_KEY),
      storage.getItem(FOOD_BARCODE_LINKS_STORAGE_KEY),
      storage.getItem(NUTRITION_PLAN_STORAGE_KEY),
      storage.getItem(WEB_SYNC_STATE_KEY),
    ]);
    return {
      previous: {
        [ASYNC_STORAGE_MEALS_KEY]: meals,
        [LIBRARY_STORAGE_KEY]: library,
        [FOOD_BARCODE_LINKS_STORAGE_KEY]: links,
        [NUTRITION_PLAN_STORAGE_KEY]: plan,
        [WEB_SYNC_STATE_KEY]: state,
      } as Record<string, string | null>,
      snapshot: readSnapshotFrom({ meals, library, links, plan }),
      state: parseState(state),
    };
  };

  const writeValues = async (previous: Record<string, string | null>, next: Record<string, string>): Promise<void> => {
    const pairs = Object.entries(next).filter(([key, value]) => previous[key] !== value) as [string, string][];
    if (pairs.length === 0) {
      return;
    }
    const written: string[] = [];
    try {
      if (storage.multiSet) {
        await storage.multiSet(pairs);
        written.push(...pairs.map(([key]) => key));
      } else {
        for (const [key, value] of pairs) {
          await storage.setItem(key, value);
          written.push(key);
        }
      }
    } catch (writeError) {
      try {
        for (const key of [...new Set([...written, ...pairs.map(([entry]) => entry)])]) {
          const original = previous[key] ?? null;
          if (original === null) {
            await storage.removeItem(key);
          } else {
            await storage.setItem(key, original);
          }
        }
        for (const [key] of pairs) {
          const restored = await storage.getItem(key);
          if (restored !== (previous[key] ?? null)) {
            throw new Error(`could not restore ${key}`);
          }
        }
      } catch (restoreError) {
        throw new SyncError('local_storage_failed', 'MacroZone could not finish saving and could not fully undo the change.', {
          cause: restoreError,
        });
      }
      throw new SyncError('local_storage_failed', 'Could not save the synced data in this browser.', { cause: writeError });
    }
  };

  const serializeSnapshot = (snapshot: WebSnapshotState, state: WebSyncState): Record<string, string> => ({
    [ASYNC_STORAGE_MEALS_KEY]: JSON.stringify(snapshot.mealRecords),
    [LIBRARY_STORAGE_KEY]: serializeLibrary(snapshot.library),
    [FOOD_BARCODE_LINKS_STORAGE_KEY]: serializeLinks(snapshot.linkRecords),
    [NUTRITION_PLAN_STORAGE_KEY]: serializePlan(snapshot.plan),
    [WEB_SYNC_STATE_KEY]: JSON.stringify(state),
  });

  const openConflictIn = (
    state: WebSyncState,
    conflict: Omit<SyncConflict, 'id'> & { id?: string },
  ): WebSyncState => {
    const existing = state.conflicts.find(
      (candidate) => candidate.status === 'open' && candidate.entityType === conflict.entityType && candidate.entityId === conflict.entityId,
    );
    const next: StoredConflict = { ...conflict, id: existing?.id ?? conflict.id ?? generateId(), status: 'open' };
    return {
      ...state,
      conflicts: [...state.conflicts.filter((candidate) => candidate.id !== next.id), next],
    };
  };

  return {
    accountKey,

    sealOperations: ({ limit, now }) =>
      queue.run(async () => {
        const { previous, snapshot, state } = await readValues();
        const timestamp = now.toISOString();
        const sealed: SealedOperation[] = [];
        let nextState = state;

        const ready = state.operations.filter((operation) => !operation.blocked && (operation.nextAttemptAt === null || operation.nextAttemptAt <= timestamp));
        for (const operation of ready.slice(0, limit)) {
          sealed.push({
            seq: 0,
            operationId: operation.operationId,
            entityType: operation.entityType,
            entityId: operation.entityId,
            kind: operation.kind,
            payloadVersion: SYNC_PAYLOAD_VERSION,
            baseRevision: operation.baseRevision,
            payload: operation.payload,
            attemptCount: operation.attemptCount,
          });
        }
        if (sealed.length >= limit) {
          return sealed;
        }

        const pendingKeys = new Set(state.operations.map((operation) => entityKey(operation.entityType, operation.entityId)));
        const present = listSnapshotEntities(snapshot);
        const created: StoredOperation[] = [];

        for (const { entityType, entityId } of present) {
          const key = entityKey(entityType, entityId);
          if (pendingKeys.has(key) || sealed.length + created.length >= limit) {
            continue;
          }
          const aggregate = readAggregateFromSnapshot(snapshot, entityType, entityId);
          if (aggregate === null) {
            continue;
          }
          const payload = encodeAggregate(aggregate);
          const known = state.revisions[key];
          if (known !== undefined && !known.deleted && known.hash === payloadHash(payload)) {
            continue;
          }
          created.push({
            operationId: generateId(),
            entityType,
            entityId,
            kind: 'upsert',
            baseRevision: known?.revision ?? 0,
            payload,
            attemptCount: 0,
            nextAttemptAt: null,
            blocked: false,
          });
        }

        const presentKeys = new Set(present.map((entity) => entityKey(entity.entityType, entity.entityId)));
        for (const [key, known] of Object.entries(state.revisions)) {
          if (presentKeys.has(key) || known.deleted || pendingKeys.has(key) || sealed.length + created.length >= limit) {
            continue;
          }
          const [entityType, entityId] = [key.slice(0, key.indexOf(':')) as SyncEntityType, key.slice(key.indexOf(':') + 1)];
          created.push({
            operationId: generateId(),
            entityType,
            entityId,
            kind: 'delete',
            baseRevision: known.revision,
            payload: null,
            attemptCount: 0,
            nextAttemptAt: null,
            blocked: false,
          });
        }

        if (created.length > 0) {
          nextState = { ...state, operations: [...state.operations, ...created] };
          await writeValues(previous, serializeSnapshot(snapshot, nextState));
          for (const operation of created) {
            sealed.push({
              seq: 0,
              operationId: operation.operationId,
              entityType: operation.entityType,
              entityId: operation.entityId,
              kind: operation.kind,
              payloadVersion: SYNC_PAYLOAD_VERSION,
              baseRevision: operation.baseRevision,
              payload: operation.payload,
              attemptCount: 0,
            });
          }
        }
        return sealed;
      }),

    acknowledge: (results, { now }) =>
      queue.run(async () => {
        const { previous, snapshot, state } = await readValues();
        const outcome: AcknowledgementOutcome = { applied: 0, conflicts: 0, rejected: 0 };
        let next = state;
        for (const result of results) {
          const operation = next.operations.find((candidate) => candidate.operationId === result.operationId);
          if (operation === undefined) {
            continue;
          }
          const key = entityKey(operation.entityType, operation.entityId);
          if (result.status === 'applied') {
            next = {
              ...next,
              operations: next.operations.filter((candidate) => candidate.operationId !== result.operationId),
              revisions: {
                ...next.revisions,
                [key]: { revision: result.revision, deleted: operation.kind === 'delete', hash: payloadHash(operation.payload) },
              },
            };
            outcome.applied += 1;
            continue;
          }
          if (result.status === 'conflict') {
            if (operation.kind !== 'delete' && !result.deleted && sameContent(operation.payload, result.payload)) {
              next = {
                ...next,
                operations: next.operations.filter((candidate) => candidate.operationId !== result.operationId),
                revisions: { ...next.revisions, [key]: { revision: result.revision, deleted: false, hash: payloadHash(result.payload) } },
              };
              outcome.applied += 1;
              continue;
            }
            next = openConflictIn(
              {
                ...next,
                operations: next.operations.map((candidate) =>
                  candidate.operationId === result.operationId ? { ...candidate, blocked: true } : candidate,
                ),
              },
              {
                entityType: operation.entityType,
                entityId: operation.entityId,
                reason: operation.kind === 'delete' || result.deleted ? 'delete_vs_edit' : 'concurrent_edit',
                localPayload: operation.payload,
                localDeleted: operation.kind === 'delete',
                cloudRevision: result.revision,
                cloudPayload: result.payload,
                cloudDeleted: result.deleted,
                detectedAt: now.toISOString(),
              },
            );
            outcome.conflicts += 1;
            continue;
          }
          next = openConflictIn(
            {
              ...next,
              operations: next.operations.map((candidate) =>
                candidate.operationId === result.operationId ? { ...candidate, blocked: true } : candidate,
              ),
            },
            {
              entityType: operation.entityType,
              entityId: operation.entityId,
              reason: 'invalid_payload',
              localPayload: operation.payload,
              localDeleted: operation.kind === 'delete',
              cloudRevision: operation.baseRevision,
              cloudPayload: null,
              cloudDeleted: false,
              detectedAt: now.toISOString(),
            },
          );
          outcome.rejected += 1;
        }
        await writeValues(previous, serializeSnapshot(snapshot, next));
        return outcome;
      }),

    recordTransientFailure: (operations, { code, now, delayMs }) =>
      queue.run(async () => {
        const { previous, snapshot, state } = await readValues();
        const ids = new Set(operations.map((operation) => operation.operationId));
        const next: WebSyncState = {
          ...state,
          operations: state.operations.map((operation) =>
            ids.has(operation.operationId)
              ? {
                  ...operation,
                  attemptCount: operation.attemptCount + 1,
                  nextAttemptAt: new Date(now.getTime() + delayMs(operation.attemptCount + 1)).toISOString(),
                }
              : operation,
          ),
          lastErrorCode: code,
        };
        await writeValues(previous, serializeSnapshot(snapshot, next));
      }),

    getCursor: async () => (await readValues()).state.cursor,

    applyPullPage: (page: SyncPullPage, { now }) =>
      queue.run(async () => {
        const { previous, snapshot, state } = await readValues();
        const outcome: PullApplyOutcome = { applied: 0, conflicts: 0, skipped: 0 };
        let workingSnapshot = snapshot;
        let next = state;

        for (const change of page.changes) {
          const key = entityKey(change.entityType, change.entityId);
          const known = next.revisions[key];
          if (known !== undefined && known.revision >= change.revision) {
            outcome.skipped += 1;
            continue;
          }
          const remoteAggregate = change.deleted
            ? null
            : decodeAggregate(change.entityType, change.entityId, change.payloadVersion, change.payload);
          if (!change.deleted && remoteAggregate === null) {
            throw new SyncError('unsupported_payload', 'This account has data that this version of MacroZone cannot read yet.');
          }
          const localAggregate = readAggregateFromSnapshot(workingSnapshot, change.entityType, change.entityId);
          const localPayload = localAggregate === null ? null : encodeAggregate(localAggregate);
          const remotePayload = change.deleted ? null : (change.payload ?? null);
          const hasPendingChange =
            next.operations.some((operation) => operation.entityType === change.entityType && operation.entityId === change.entityId) ||
            (known !== undefined && localPayload !== null && payloadHash(localPayload) !== known.hash) ||
            (known === undefined && localPayload !== null);

          if (samePayload(localPayload, remotePayload) || sameContent(localPayload, remotePayload)) {
            if (remoteAggregate !== null && !samePayload(localPayload, remotePayload)) {
              workingSnapshot = applyAggregateToSnapshot(workingSnapshot, remoteAggregate);
            }
            next = {
              ...next,
              operations: next.operations.filter(
                (operation) => !(operation.entityType === change.entityType && operation.entityId === change.entityId && !operation.blocked),
              ),
              revisions: { ...next.revisions, [key]: { revision: change.revision, deleted: change.deleted, hash: payloadHash(remotePayload) } },
            };
            outcome.applied += 1;
            continue;
          }

          if (hasPendingChange) {
            next = openConflictIn(next, {
              entityType: change.entityType,
              entityId: change.entityId,
              reason: change.deleted || localAggregate === null ? 'delete_vs_edit' : 'concurrent_edit',
              localPayload,
              localDeleted: localAggregate === null,
              cloudRevision: change.revision,
              cloudPayload: remotePayload,
              cloudDeleted: change.deleted,
              detectedAt: now.toISOString(),
            });
            outcome.conflicts += 1;
            continue;
          }

          workingSnapshot =
            remoteAggregate === null
              ? removeEntityFromSnapshot(workingSnapshot, change.entityType, change.entityId)
              : applyAggregateToSnapshot(workingSnapshot, remoteAggregate);
          next = {
            ...next,
            revisions: { ...next.revisions, [key]: { revision: change.revision, deleted: change.deleted, hash: payloadHash(remotePayload) } },
          };
          outcome.applied += 1;
        }

        next = { ...next, cursor: page.nextCursor };
        await writeValues(previous, serializeSnapshot(workingSnapshot, next));
        return outcome;
      }),

    summarize: async () => {
      const { snapshot, state } = await readValues();
      const present = listSnapshotEntities(snapshot);
      const presentKeys = new Set(present.map((entity) => entityKey(entity.entityType, entity.entityId)));
      let pendingCount = state.operations.filter((operation) => !operation.blocked).length;
      for (const { entityType, entityId } of present) {
        const key = entityKey(entityType, entityId);
        if (state.operations.some((operation) => operation.entityType === entityType && operation.entityId === entityId)) {
          continue;
        }
        const aggregate = readAggregateFromSnapshot(snapshot, entityType, entityId);
        const known = state.revisions[key];
        if (aggregate !== null && (known === undefined || known.deleted || known.hash !== payloadHash(encodeAggregate(aggregate)))) {
          pendingCount += 1;
        }
      }
      for (const [key, known] of Object.entries(state.revisions)) {
        if (!known.deleted && !presentKeys.has(key)) {
          pendingCount += 1;
        }
      }
      return {
        pendingCount,
        conflictCount: state.conflicts.filter((conflict) => conflict.status === 'open').length,
        lastSuccessAt: state.lastSuccessAt,
        lastErrorCode: state.lastErrorCode,
        blockedReason: state.blockedReason,
        cursor: state.cursor,
      };
    },

    listConflicts: async () => {
      const { state } = await readValues();
      return state.conflicts
        .filter((conflict) => conflict.status === 'open')
        .map(({ status, ...conflict }) => conflict as SyncConflict);
    },

    resolveConflict: (conflictId, resolution: SyncConflictResolution, { now }) =>
      queue.run(async () => {
        const { previous, snapshot, state } = await readValues();
        const conflict = state.conflicts.find((candidate) => candidate.id === conflictId && candidate.status === 'open');
        if (conflict === undefined) {
          return;
        }
        const key = entityKey(conflict.entityType, conflict.entityId);
        const cloudAggregate =
          conflict.cloudDeleted || conflict.cloudPayload === null
            ? null
            : decodeAggregate(conflict.entityType, conflict.entityId, SYNC_PAYLOAD_VERSION, conflict.cloudPayload);
        if (!conflict.cloudDeleted && conflict.cloudPayload !== null && cloudAggregate === null) {
          throw new SyncError('unsupported_payload', 'This change cannot be read by this version of MacroZone.');
        }

        let workingSnapshot = snapshot;
        let next: WebSyncState = {
          ...state,
          operations: state.operations.filter(
            (operation) => !(operation.entityType === conflict.entityType && operation.entityId === conflict.entityId),
          ),
          conflicts: state.conflicts.map((candidate) =>
            candidate.id === conflictId ? { ...candidate, status: 'resolved' as const } : candidate,
          ),
        };

        if (resolution === 'duplicate') {
          const localAggregate = readAggregateFromSnapshot(workingSnapshot, conflict.entityType, conflict.entityId);
          const copy = localAggregate === null ? null : copyAggregateAsNewEntity(localAggregate, generateId, now.toISOString());
          if (copy !== null) {
            workingSnapshot = applyAggregateToSnapshot(workingSnapshot, copy);
          }
        }

        if (resolution === 'use_cloud' || resolution === 'duplicate') {
          workingSnapshot =
            cloudAggregate === null
              ? removeEntityFromSnapshot(workingSnapshot, conflict.entityType, conflict.entityId)
              : applyAggregateToSnapshot(workingSnapshot, cloudAggregate);
          next = {
            ...next,
            revisions: {
              ...next.revisions,
              [key]: {
                revision: conflict.cloudRevision,
                deleted: conflict.cloudDeleted,
                hash: payloadHash(conflict.cloudDeleted ? null : conflict.cloudPayload),
              },
            },
          };
        } else {
          next = {
            ...next,
            revisions: {
              ...next.revisions,
              [key]: { revision: conflict.cloudRevision, deleted: conflict.cloudDeleted, hash: 'pending-local-change' },
            },
          };
        }

        await writeValues(previous, serializeSnapshot(workingSnapshot, next));
      }),

    recordRunResult: ({ now, errorCode, blockedReason }) =>
      queue.run(async () => {
        const { previous, snapshot, state } = await readValues();
        const next: WebSyncState = {
          ...state,
          lastErrorCode: errorCode,
          blockedReason,
          lastSuccessAt: errorCode === null ? now.toISOString() : state.lastSuccessAt,
        };
        await writeValues(previous, serializeSnapshot(snapshot, next));
      }),
  };
}

export function createWebSyncResultForTests(results: readonly SyncPushResult[]): readonly SyncPushResult[] {
  return results;
}

export type { WebSyncState, StoredConflict, SyncConflictReason };
