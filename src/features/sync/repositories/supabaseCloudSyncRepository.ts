import {
  SyncError,
  type CloudSyncRepository,
  type SyncChange,
  type SyncErrorCode,
  type SyncOperation,
  type SyncPullPage,
  type SyncPushResult,
} from '@/features/sync/types';

type RpcResult = { data: unknown; error: { message?: string; code?: string; details?: string; hint?: string } | null };

export type SupabaseRpcClient = {
  rpc(name: string, params?: Record<string, unknown>): PromiseLike<RpcResult> & { abortSignal?(signal: AbortSignal): PromiseLike<RpcResult> };
};

const MESSAGE_CODES: { match: RegExp; code: SyncErrorCode }[] = [
  { match: /not_authenticated/i, code: 'auth_expired' },
  { match: /jwt expired|invalid token|invalid claim/i, code: 'auth_expired' },
  { match: /cursor_expired/i, code: 'cursor_expired' },
  { match: /too_many_operations|invalid_request|invalid_operation|invalid_identifier/i, code: 'validation_failed' },
  { match: /rate limit|too many requests/i, code: 'rate_limited' },
  { match: /fetch failed|network request failed|failed to fetch/i, code: 'offline' },
];

export function mapCloudError(error: unknown): SyncError {
  if (error instanceof SyncError) {
    return error;
  }
  const candidate = error as { message?: string; code?: string; status?: number } | undefined;
  const message = candidate?.message ?? '';
  const code = candidate?.code ?? '';
  if (code === 'PGRST301' || candidate?.status === 401 || candidate?.status === 403) {
    return new SyncError('auth_expired', 'Sign in again to keep syncing.', { cause: error });
  }
  if (candidate?.status === 429) {
    return new SyncError('rate_limited', 'MacroZone is syncing too often. It will try again shortly.', { cause: error });
  }
  if (typeof candidate?.status === 'number' && candidate.status >= 500) {
    return new SyncError('service_unavailable', 'Cloud sync is unavailable right now.', { cause: error });
  }
  for (const entry of MESSAGE_CODES) {
    if (entry.match.test(message) || entry.match.test(code)) {
      const messages: Record<string, string> = {
        auth_expired: 'Sign in again to keep syncing.',
        cursor_expired: 'This device has been offline too long and needs a fresh copy of your account.',
        validation_failed: 'MacroZone could not sync these changes.',
        rate_limited: 'MacroZone is syncing too often. It will try again shortly.',
        offline: 'MacroZone is offline.',
      };
      return new SyncError(entry.code, messages[entry.code] ?? 'Cloud sync failed.', { cause: error });
    }
  }
  if (error instanceof TypeError) {
    return new SyncError('offline', 'MacroZone is offline.', { cause: error });
  }
  return new SyncError('unexpected_response', 'Cloud sync returned something MacroZone could not read.', { cause: error });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePushResults(data: unknown): SyncPushResult[] {
  if (!isRecord(data) || !Array.isArray(data.results)) {
    throw new SyncError('unexpected_response', 'Cloud sync returned an unexpected response.');
  }
  return data.results.map((entry): SyncPushResult => {
    if (!isRecord(entry) || typeof entry.operationId !== 'string' || typeof entry.status !== 'string') {
      throw new SyncError('unexpected_response', 'Cloud sync returned an unexpected response.');
    }
    if (entry.status === 'applied') {
      return { operationId: entry.operationId, status: 'applied', revision: Number(entry.revision ?? 0) };
    }
    if (entry.status === 'conflict') {
      return {
        operationId: entry.operationId,
        status: 'conflict',
        revision: Number(entry.revision ?? 0),
        deleted: entry.deleted === true,
        payload: isRecord(entry.payload) ? entry.payload : null,
      };
    }
    return { operationId: entry.operationId, status: 'rejected', errorCode: String(entry.errorCode ?? 'rejected') };
  });
}

function parsePullPage(data: unknown): SyncPullPage {
  if (!isRecord(data) || !Array.isArray(data.changes)) {
    throw new SyncError('unexpected_response', 'Cloud sync returned an unexpected response.');
  }
  const changes = data.changes.map((entry): SyncChange => {
    if (!isRecord(entry) || typeof entry.entityType !== 'string' || typeof entry.entityId !== 'string') {
      throw new SyncError('unexpected_response', 'Cloud sync returned an unexpected response.');
    }
    return {
      entityType: entry.entityType as SyncChange['entityType'],
      entityId: entry.entityId,
      revision: Number(entry.revision ?? 0),
      changeSeq: Number(entry.changeSeq ?? 0),
      payloadVersion: Number(entry.payloadVersion ?? 0),
      deleted: entry.deleted === true,
      payload: isRecord(entry.payload) ? entry.payload : null,
    };
  });
  return { changes, nextCursor: Number(data.nextCursor ?? 0), hasMore: data.hasMore === true };
}

export function createSupabaseCloudSyncRepository(client: SupabaseRpcClient): CloudSyncRepository {
  const call = async (name: string, params: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> => {
    let result: RpcResult;
    try {
      const request = client.rpc(name, params);
      result = await (signal !== undefined && typeof request.abortSignal === 'function' ? request.abortSignal(signal) : request);
    } catch (error) {
      if (signal?.aborted === true) {
        throw new SyncError('cancelled', 'Synchronization was cancelled.', { cause: error });
      }
      throw mapCloudError(error);
    }
    if (result.error !== null) {
      throw mapCloudError(result.error);
    }
    return result.data;
  };

  return {
    push: async (operations: readonly SyncOperation[], options) => {
      const payload = operations.map((operation) => ({
        operationId: operation.operationId,
        entityType: operation.entityType,
        entityId: operation.entityId,
        kind: operation.kind,
        payloadVersion: operation.payloadVersion,
        baseRevision: operation.baseRevision,
        payload: operation.payload,
      }));
      return parsePushResults(await call('sync_push', { p_operations: payload }, options?.signal));
    },

    pull: async (afterCursor, limit, options) =>
      parsePullPage(await call('sync_pull', { p_after_seq: afterCursor, p_limit: limit }, options?.signal)),
  };
}
