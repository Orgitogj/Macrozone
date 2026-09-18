import {
  deleteAggregate,
  findDuplicateFoodId,
  readAggregate,
  writeAggregate,
} from '@/features/sync/repositories/sqliteAggregateStore';
import {
  canonicalJson,
  decodeAggregate,
  encodeAggregate,
  payloadHash,
  sameContent,
  samePayload,
} from '@/features/sync/utils/aggregatePayload';
import {
  SyncError,
  type AcknowledgementOutcome,
  type LocalSyncStore,
  type PullApplyOutcome,
  type SealedOperation,
  type SyncAggregate,
  type SyncConflict,
  type SyncConflictReason,
  type SyncConflictResolution,
  type SyncEntityType,
  type SyncPendingSummary,
  type SyncPullPage,
} from '@/features/sync/types';
import { copyAggregateAsNewEntity } from '@/features/sync/utils/duplicateAggregate';
import { SYNC_PAYLOAD_VERSION } from '@/storage/database/syncSchema';
import type { SqlDatabase, SqlExecutor } from '@/storage/database/types';
import { createId } from '@/utils/id';
import { createSerialQueue, type SerialQueue } from '@/utils/serialQueue';

type OutboxRow = {
  seq: number;
  operation_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  operation_kind: 'upsert' | 'delete';
  payload_version: number;
  base_revision: number | null;
  payload_json: string | null;
  attempt_count: number;
};

type RevisionRow = { server_revision: number; deleted: number };

type ConflictRow = {
  id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  reason: SyncConflictReason;
  local_payload_json: string | null;
  local_deleted: number;
  cloud_revision: number;
  cloud_payload_json: string | null;
  cloud_deleted: number;
  detected_at: string;
};

function parseJson(value: string | null): Record<string, unknown> | null {
  if (value === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function readRevision(executor: SqlExecutor, entityType: SyncEntityType, entityId: string): Promise<RevisionRow | null> {
  return executor.getFirstAsync<RevisionRow>(
    'SELECT server_revision, deleted FROM sync_entity_revisions WHERE entity_type = ? AND entity_id = ?',
    [entityType, entityId],
  );
}

async function setRevision(
  executor: SqlExecutor,
  entityType: SyncEntityType,
  entityId: string,
  revision: number,
  deleted: boolean,
  hash: string | null,
  timestamp: string,
): Promise<void> {
  await executor.runAsync(
    `INSERT INTO sync_entity_revisions (entity_type, entity_id, server_revision, deleted, synced_hash, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (entity_type, entity_id) DO UPDATE SET server_revision = excluded.server_revision,
       deleted = excluded.deleted, synced_hash = excluded.synced_hash, updated_at = excluded.updated_at`,
    [entityType, entityId, revision, deleted ? 1 : 0, hash, timestamp],
  );
}

async function enqueuePending(
  executor: SqlExecutor,
  entityType: SyncEntityType,
  entityId: string,
  kind: 'upsert' | 'delete',
  operationId: string,
  timestamp: string,
): Promise<void> {
  await executor.runAsync(
    `INSERT INTO sync_outbox (operation_id, entity_type, entity_id, operation_kind, payload_version, state, local_mutated_at, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
     ON CONFLICT (entity_type, entity_id) WHERE state = 'pending'
     DO UPDATE SET operation_kind = excluded.operation_kind, local_mutated_at = excluded.local_mutated_at`,
    [operationId, entityType, entityId, kind, SYNC_PAYLOAD_VERSION, timestamp, timestamp],
  );
}

async function openConflict(
  executor: SqlExecutor,
  options: {
    id: string;
    entityType: SyncEntityType;
    entityId: string;
    reason: SyncConflictReason;
    localPayload: Record<string, unknown> | null;
    localDeleted: boolean;
    cloudRevision: number;
    cloudPayload: Record<string, unknown> | null;
    cloudDeleted: boolean;
    timestamp: string;
  },
): Promise<void> {
  await executor.runAsync(
    `INSERT INTO sync_conflicts (id, entity_type, entity_id, reason, local_payload_json, local_deleted, cloud_revision,
       cloud_payload_json, cloud_deleted, status, resolution, detected_at, resolved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', NULL, ?, NULL)
     ON CONFLICT (entity_type, entity_id) WHERE status = 'open'
     DO UPDATE SET reason = excluded.reason, local_payload_json = excluded.local_payload_json,
       local_deleted = excluded.local_deleted, cloud_revision = excluded.cloud_revision,
       cloud_payload_json = excluded.cloud_payload_json, cloud_deleted = excluded.cloud_deleted,
       detected_at = excluded.detected_at`,
    [
      options.id,
      options.entityType,
      options.entityId,
      options.reason,
      options.localPayload === null ? null : JSON.stringify(options.localPayload),
      options.localDeleted ? 1 : 0,
      options.cloudRevision,
      options.cloudPayload === null ? null : JSON.stringify(options.cloudPayload),
      options.cloudDeleted ? 1 : 0,
      options.timestamp,
    ],
  );
}

async function applyRemoteAggregate(
  transaction: SqlExecutor,
  aggregate: SyncAggregate,
  generateId: () => string,
  timestamp: string,
): Promise<void> {
  const reassignments = await writeAggregate(transaction, aggregate);
  for (const reassignment of reassignments) {
    await enqueuePending(transaction, 'food', reassignment.previousFoodId, 'upsert', generateId(), timestamp);
  }
}

export function createSqliteLocalSyncStore({
  accountKey,
  getDatabase,
  queue = createSerialQueue(),
  generateId = createId,
}: {
  accountKey: string;
  getDatabase: () => Promise<SqlDatabase>;
  queue?: SerialQueue;
  generateId?: () => string;
}): LocalSyncStore {
  const write = <T>(task: (database: SqlDatabase) => Promise<T>): Promise<T> =>
    queue.run(async () => {
      try {
        return await task(await getDatabase());
      } catch (error) {
        if (error instanceof SyncError) {
          throw error;
        }
        throw new SyncError('local_storage_failed', 'Could not update the sync data on this device.', { cause: error });
      }
    });

  const read = async <T>(task: (database: SqlDatabase) => Promise<T>): Promise<T> => {
    try {
      return await task(await getDatabase());
    } catch (error) {
      throw new SyncError('local_storage_failed', 'Could not read the sync data on this device.', { cause: error });
    }
  };

  return {
    accountKey,

    sealOperations: ({ limit, now }) =>
      write(async (database) => {
        const sealed: SealedOperation[] = [];
        const timestamp = now.toISOString();
        await database.withExclusiveTransactionAsync(async (transaction) => {
          const candidates = await transaction.getAllAsync<OutboxRow>(
            `SELECT seq, operation_id, entity_type, entity_id, operation_kind, payload_version, base_revision, payload_json, attempt_count
             FROM sync_outbox AS outbox
             WHERE state = 'sealed'
               AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
             ORDER BY seq
             LIMIT ?`,
            [timestamp, limit],
          );
          for (const row of candidates) {
            sealed.push({
              seq: row.seq,
              operationId: row.operation_id,
              entityType: row.entity_type,
              entityId: row.entity_id,
              kind: row.operation_kind,
              payloadVersion: row.payload_version,
              baseRevision: row.base_revision ?? 0,
              payload: parseJson(row.payload_json),
              attemptCount: row.attempt_count,
            });
          }
          if (sealed.length >= limit) {
            return;
          }
          const pending = await transaction.getAllAsync<OutboxRow>(
            `SELECT seq, operation_id, entity_type, entity_id, operation_kind, payload_version, base_revision, payload_json, attempt_count
             FROM sync_outbox AS outbox
             WHERE state = 'pending'
               AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
               AND NOT EXISTS (
                 SELECT 1 FROM sync_outbox AS other
                 WHERE other.entity_type = outbox.entity_type AND other.entity_id = outbox.entity_id
                   AND other.state IN ('sealed', 'blocked')
               )
             ORDER BY seq
             LIMIT ?`,
            [timestamp, limit - sealed.length],
          );
          for (const row of pending) {
            const aggregate = await readAggregate(transaction, row.entity_type, row.entity_id);
            const revision = await readRevision(transaction, row.entity_type, row.entity_id);
            const baseRevision = revision?.server_revision ?? 0;
            const kind = aggregate === null ? 'delete' : 'upsert';
            if (kind === 'delete' && baseRevision === 0) {
              await transaction.runAsync('DELETE FROM sync_outbox WHERE seq = ?', [row.seq]);
              continue;
            }
            const payload = aggregate === null ? null : encodeAggregate(aggregate);
            await transaction.runAsync(
              `UPDATE sync_outbox SET state = 'sealed', operation_kind = ?, payload_json = ?, base_revision = ?, payload_version = ?
               WHERE seq = ?`,
              [kind, payload === null ? null : JSON.stringify(payload), baseRevision, SYNC_PAYLOAD_VERSION, row.seq],
            );
            sealed.push({
              seq: row.seq,
              operationId: row.operation_id,
              entityType: row.entity_type,
              entityId: row.entity_id,
              kind,
              payloadVersion: SYNC_PAYLOAD_VERSION,
              baseRevision,
              payload,
              attemptCount: row.attempt_count,
            });
          }
        });
        return sealed;
      }),

    acknowledge: (results, { now }) =>
      write(async (database) => {
        const timestamp = now.toISOString();
        const outcome: AcknowledgementOutcome = { applied: 0, conflicts: 0, rejected: 0 };
        await database.withExclusiveTransactionAsync(async (transaction) => {
          for (const result of results) {
            const row = await transaction.getFirstAsync<OutboxRow>(
              `SELECT seq, operation_id, entity_type, entity_id, operation_kind, payload_version, base_revision, payload_json, attempt_count
               FROM sync_outbox WHERE operation_id = ?`,
              [result.operationId],
            );
            if (row === null) {
              continue;
            }
            if (result.status === 'applied') {
              await transaction.runAsync('DELETE FROM sync_outbox WHERE seq = ?', [row.seq]);
              await setRevision(
                transaction,
                row.entity_type,
                row.entity_id,
                result.revision,
                row.operation_kind === 'delete',
                payloadHash(parseJson(row.payload_json)),
                timestamp,
              );
              outcome.applied += 1;
              continue;
            }
            if (result.status === 'conflict') {
              if (sameContent(parseJson(row.payload_json), result.payload) && row.operation_kind !== 'delete' && !result.deleted) {
                await transaction.runAsync('DELETE FROM sync_outbox WHERE seq = ?', [row.seq]);
                await setRevision(transaction, row.entity_type, row.entity_id, result.revision, false, payloadHash(result.payload), timestamp);
                outcome.applied += 1;
                continue;
              }
              await transaction.runAsync("UPDATE sync_outbox SET state = 'blocked', last_error_code = 'conflict' WHERE seq = ?", [row.seq]);
              await openConflict(transaction, {
                id: generateId(),
                entityType: row.entity_type,
                entityId: row.entity_id,
                reason: row.operation_kind === 'delete' || result.deleted ? 'delete_vs_edit' : 'concurrent_edit',
                localPayload: parseJson(row.payload_json),
                localDeleted: row.operation_kind === 'delete',
                cloudRevision: result.revision,
                cloudPayload: result.payload,
                cloudDeleted: result.deleted,
                timestamp,
              });
              outcome.conflicts += 1;
              continue;
            }
            await transaction.runAsync("UPDATE sync_outbox SET state = 'blocked', last_error_code = ? WHERE seq = ?", [
              result.errorCode,
              row.seq,
            ]);
            await openConflict(transaction, {
              id: generateId(),
              entityType: row.entity_type,
              entityId: row.entity_id,
              reason: 'invalid_payload',
              localPayload: parseJson(row.payload_json),
              localDeleted: row.operation_kind === 'delete',
              cloudRevision: row.base_revision ?? 0,
              cloudPayload: null,
              cloudDeleted: false,
              timestamp,
            });
            outcome.rejected += 1;
          }
        });
        return outcome;
      }),

    recordTransientFailure: (operations, { code, now, delayMs }) =>
      write(async (database) => {
        await database.withExclusiveTransactionAsync(async (transaction) => {
          for (const operation of operations) {
            const attempt = operation.attemptCount + 1;
            const nextAttemptAt = new Date(now.getTime() + delayMs(attempt)).toISOString();
            await transaction.runAsync(
              'UPDATE sync_outbox SET attempt_count = ?, next_attempt_at = ?, last_error_code = ? WHERE operation_id = ?',
              [attempt, nextAttemptAt, code, operation.operationId],
            );
          }
        });
      }),

    getCursor: () =>
      read(async (database) => {
        const row = await database.getFirstAsync<{ pull_cursor: number }>('SELECT pull_cursor FROM sync_state WHERE id = 1', []);
        return row?.pull_cursor ?? 0;
      }),

    applyPullPage: (page: SyncPullPage, { now }) =>
      write(async (database) => {
        const timestamp = now.toISOString();
        const outcome: PullApplyOutcome = { applied: 0, conflicts: 0, skipped: 0 };
        await database.withExclusiveTransactionAsync(async (transaction) => {
          await transaction.runAsync('UPDATE sync_state SET applying_remote = 1 WHERE id = 1', []);
          for (const change of page.changes) {
            const known = await readRevision(transaction, change.entityType, change.entityId);
            if (known !== null && known.server_revision >= change.revision) {
              outcome.skipped += 1;
              continue;
            }
            const remoteAggregate = change.deleted
              ? null
              : decodeAggregate(change.entityType, change.entityId, change.payloadVersion, change.payload);
            if (!change.deleted && remoteAggregate === null) {
              throw new SyncError('unsupported_payload', 'This account has data that this version of MacroZone cannot read yet.');
            }
            const localAggregate = await readAggregate(transaction, change.entityType, change.entityId);
            const localPayload = localAggregate === null ? null : encodeAggregate(localAggregate);
            const remotePayload = change.deleted ? null : (change.payload ?? null);
            const pendingOperation = await transaction.getFirstAsync<{ seq: number }>(
              'SELECT seq FROM sync_outbox WHERE entity_type = ? AND entity_id = ? LIMIT 1',
              [change.entityType, change.entityId],
            );
            if (samePayload(localPayload, remotePayload) || sameContent(localPayload, remotePayload)) {
              await transaction.runAsync("DELETE FROM sync_outbox WHERE entity_type = ? AND entity_id = ? AND state = 'pending'", [
                change.entityType,
                change.entityId,
              ]);
              if (remoteAggregate !== null && !samePayload(localPayload, remotePayload)) {
                await applyRemoteAggregate(transaction, remoteAggregate, generateId, timestamp);
              }
              await setRevision(
                transaction,
                change.entityType,
                change.entityId,
                change.revision,
                change.deleted,
                payloadHash(remotePayload),
                timestamp,
              );
              outcome.applied += 1;
              continue;
            }
            if (pendingOperation !== null) {
              await openConflict(transaction, {
                id: generateId(),
                entityType: change.entityType,
                entityId: change.entityId,
                reason: change.deleted || localAggregate === null ? 'delete_vs_edit' : 'concurrent_edit',
                localPayload,
                localDeleted: localAggregate === null,
                cloudRevision: change.revision,
                cloudPayload: remotePayload,
                cloudDeleted: change.deleted,
                timestamp,
              });
              outcome.conflicts += 1;
              continue;
            }
            if (remoteAggregate !== null) {
              const duplicateId = await findDuplicateFoodId(transaction, remoteAggregate);
              if (duplicateId !== null) {
                await openConflict(transaction, {
                  id: generateId(),
                  entityType: change.entityType,
                  entityId: change.entityId,
                  reason: 'duplicate_food',
                  localPayload,
                  localDeleted: localAggregate === null,
                  cloudRevision: change.revision,
                  cloudPayload: remotePayload,
                  cloudDeleted: false,
                  timestamp,
                });
                outcome.conflicts += 1;
                continue;
              }
              await applyRemoteAggregate(transaction, remoteAggregate, generateId, timestamp);
            } else {
              await deleteAggregate(transaction, change.entityType, change.entityId);
            }
            await setRevision(
              transaction,
              change.entityType,
              change.entityId,
              change.revision,
              change.deleted,
              payloadHash(remotePayload),
              timestamp,
            );
            outcome.applied += 1;
          }
          await transaction.runAsync('UPDATE sync_state SET pull_cursor = ?, applying_remote = 0 WHERE id = 1', [page.nextCursor]);
        });
        return outcome;
      }),

    summarize: () =>
      read(async (database) => {
        const pending = await database.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) AS count FROM sync_outbox WHERE state IN ('pending', 'sealed')",
          [],
        );
        const blocked = await database.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) AS count FROM sync_conflicts WHERE status = 'open'",
          [],
        );
        const state = await database.getFirstAsync<{
          pull_cursor: number;
          last_success_at: string | null;
          last_error_code: string | null;
          blocked_reason: string | null;
        }>('SELECT pull_cursor, last_success_at, last_error_code, blocked_reason FROM sync_state WHERE id = 1', []);
        return {
          pendingCount: pending?.count ?? 0,
          conflictCount: blocked?.count ?? 0,
          lastSuccessAt: state?.last_success_at ?? null,
          lastErrorCode: state?.last_error_code ?? null,
          blockedReason: state?.blocked_reason ?? null,
          cursor: state?.pull_cursor ?? 0,
        } satisfies SyncPendingSummary;
      }),

    listConflicts: () =>
      read(async (database) => {
        const rows = await database.getAllAsync<ConflictRow>(
          `SELECT id, entity_type, entity_id, reason, local_payload_json, local_deleted, cloud_revision,
             cloud_payload_json, cloud_deleted, detected_at
           FROM sync_conflicts WHERE status = 'open' ORDER BY detected_at, id`,
          [],
        );
        return rows.map(
          (row): SyncConflict => ({
            id: row.id,
            entityType: row.entity_type,
            entityId: row.entity_id,
            reason: row.reason,
            localPayload: parseJson(row.local_payload_json),
            localDeleted: row.local_deleted === 1,
            cloudRevision: row.cloud_revision,
            cloudPayload: parseJson(row.cloud_payload_json),
            cloudDeleted: row.cloud_deleted === 1,
            detectedAt: row.detected_at,
          }),
        );
      }),

    resolveConflict: (conflictId, resolution: SyncConflictResolution, { now }) =>
      write(async (database) => {
        const timestamp = now.toISOString();
        await database.withExclusiveTransactionAsync(async (transaction) => {
          const row = await transaction.getFirstAsync<ConflictRow & { status: string }>(
            `SELECT id, entity_type, entity_id, reason, local_payload_json, local_deleted, cloud_revision,
               cloud_payload_json, cloud_deleted, detected_at, status
             FROM sync_conflicts WHERE id = ?`,
            [conflictId],
          );
          if (row === null || row.status !== 'open') {
            return;
          }
          const cloudPayload = parseJson(row.cloud_payload_json);
          const cloudAggregate =
            row.cloud_deleted === 1 || cloudPayload === null
              ? null
              : decodeAggregate(row.entity_type, row.entity_id, SYNC_PAYLOAD_VERSION, cloudPayload);
          if (row.cloud_deleted !== 1 && cloudPayload !== null && cloudAggregate === null) {
            throw new SyncError('unsupported_payload', 'This change cannot be read by this version of MacroZone.');
          }

          if (resolution === 'duplicate') {
            const localAggregate = await readAggregate(transaction, row.entity_type, row.entity_id);
            if (localAggregate !== null) {
              const copy = copyAggregateAsNewEntity(localAggregate, generateId, timestamp);
              if (copy !== null) {
                await writeAggregate(transaction, copy);
              }
            }
          }

          if (resolution === 'use_cloud' || resolution === 'duplicate') {
            await transaction.runAsync('UPDATE sync_state SET applying_remote = 1 WHERE id = 1', []);
            if (cloudAggregate === null) {
              await deleteAggregate(transaction, row.entity_type, row.entity_id);
            } else {
              await applyRemoteAggregate(transaction, cloudAggregate, generateId, timestamp);
            }
            await transaction.runAsync('UPDATE sync_state SET applying_remote = 0 WHERE id = 1', []);
            await transaction.runAsync('DELETE FROM sync_outbox WHERE entity_type = ? AND entity_id = ?', [row.entity_type, row.entity_id]);
            await setRevision(
              transaction,
              row.entity_type,
              row.entity_id,
              row.cloud_revision,
              row.cloud_deleted === 1,
              payloadHash(row.cloud_deleted === 1 ? null : cloudPayload),
              timestamp,
            );
          } else {
            await transaction.runAsync('DELETE FROM sync_outbox WHERE entity_type = ? AND entity_id = ?', [row.entity_type, row.entity_id]);
            await setRevision(
              transaction,
              row.entity_type,
              row.entity_id,
              row.cloud_revision,
              row.cloud_deleted === 1,
              null,
              timestamp,
            );
            const localAggregate = await readAggregate(transaction, row.entity_type, row.entity_id);
            await enqueuePending(
              transaction,
              row.entity_type,
              row.entity_id,
              localAggregate === null ? 'delete' : 'upsert',
              generateId(),
              timestamp,
            );
          }

          await transaction.runAsync(
            "UPDATE sync_conflicts SET status = 'resolved', resolution = ?, resolved_at = ? WHERE id = ?",
            [resolution, timestamp, conflictId],
          );
        });
      }),

    recordRunResult: ({ now, errorCode, blockedReason }) =>
      write(async (database) => {
        const timestamp = now.toISOString();
        await database.runAsync(
          `UPDATE sync_state SET last_attempt_at = ?, last_error_code = ?, blocked_reason = ?,
             last_success_at = CASE WHEN ? IS NULL THEN ? ELSE last_success_at END
           WHERE id = 1`,
          [timestamp, errorCode, blockedReason, errorCode, timestamp],
        );
      }),
  };
}

export function localPayloadOf(aggregate: SyncAggregate | null): string | null {
  return aggregate === null ? null : canonicalJson(encodeAggregate(aggregate));
}
