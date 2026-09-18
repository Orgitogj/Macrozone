import {
  SyncError,
  type LocalSyncStore,
  type CloudSyncRepository,
  type SyncErrorCode,
  type SealedOperation,
} from '@/features/sync/types';

export type SyncRunReason = 'sign_in' | 'app_active' | 'connectivity' | 'local_change' | 'manual' | 'guest_import';

export type SyncRunOutcome = {
  status: 'completed' | 'failed' | 'cancelled' | 'skipped';
  errorCode: SyncErrorCode | null;
  pushed: number;
  pulled: number;
  conflicts: number;
};

export type SyncPhase = 'idle' | 'syncing';

export type SyncCoordinatorState = {
  phase: SyncPhase;
  lastReason: SyncRunReason | null;
  lastOutcome: SyncRunOutcome | null;
};

export type ConnectivityProvider = {
  isOnline(): Promise<boolean>;
};

export const SYNC_BACKOFF = {
  baseMs: 5_000,
  maxMs: 15 * 60_000,
} as const;

export function backoffDelayMs(attempt: number, random: () => number = Math.random): number {
  const exponential = Math.min(SYNC_BACKOFF.maxMs, SYNC_BACKOFF.baseMs * 2 ** Math.max(0, attempt - 1));
  return Math.round(exponential * (0.5 + random() * 0.5));
}

function errorCodeOf(error: unknown): SyncErrorCode {
  return error instanceof SyncError ? error.code : 'unexpected_response';
}

function blockedReasonOf(code: SyncErrorCode): string | null {
  return code === 'unsupported_payload' || code === 'cursor_expired' ? code : null;
}

export function createSyncCoordinator({
  store,
  cloud,
  connectivity,
  now = () => new Date(),
  random = Math.random,
  maxPushBatch = 50,
  maxPullPage = 200,
  maxRounds = 5,
  onStateChange,
}: {
  store: LocalSyncStore;
  cloud: CloudSyncRepository;
  connectivity: ConnectivityProvider;
  now?: () => Date;
  random?: () => number;
  maxPushBatch?: number;
  maxPullPage?: number;
  maxRounds?: number;
  onStateChange?: (state: SyncCoordinatorState) => void;
}) {
  let state: SyncCoordinatorState = { phase: 'idle', lastReason: null, lastOutcome: null };
  let running: Promise<SyncRunOutcome> | null = null;
  let controller: AbortController | null = null;
  let stopped = false;

  const setState = (next: Partial<SyncCoordinatorState>) => {
    state = { ...state, ...next };
    onStateChange?.(state);
  };

  const ensureActive = (signal: AbortSignal) => {
    if (signal.aborted) {
      throw new SyncError('cancelled', 'Synchronization was cancelled.');
    }
  };

  const pushAll = async (signal: AbortSignal, outcome: SyncRunOutcome): Promise<boolean> => {
    for (;;) {
      ensureActive(signal);
      const operations = await store.sealOperations({ limit: maxPushBatch, now: now() });
      if (operations.length === 0) {
        return false;
      }
      let results;
      try {
        results = await cloud.push(operations, { signal });
      } catch (error) {
        await recordFailure(operations, error);
        throw error;
      }
      ensureActive(signal);
      const acknowledged = await store.acknowledge(results, { now: now() });
      outcome.pushed += acknowledged.applied;
      outcome.conflicts += acknowledged.conflicts + acknowledged.rejected;
      if (acknowledged.applied === 0 && acknowledged.conflicts + acknowledged.rejected === operations.length) {
        return true;
      }
    }
  };

  const recordFailure = async (operations: readonly SealedOperation[], error: unknown): Promise<void> => {
    const code = errorCodeOf(error);
    if (code === 'cancelled' || code === 'scope_changed' || operations.length === 0) {
      return;
    }
    try {
      await store.recordTransientFailure(operations, {
        code,
        now: now(),
        delayMs: (attempt) => backoffDelayMs(attempt, random),
      });
    } catch {
      return;
    }
  };

  const pullAll = async (signal: AbortSignal, outcome: SyncRunOutcome): Promise<void> => {
    for (let page = 0; page < 1000; page += 1) {
      ensureActive(signal);
      const cursor = await store.getCursor();
      const pulled = await cloud.pull(cursor, maxPullPage, { signal });
      ensureActive(signal);
      const applied = await store.applyPullPage(pulled, { now: now() });
      outcome.pulled += applied.applied;
      outcome.conflicts += applied.conflicts;
      if (!pulled.hasMore) {
        return;
      }
    }
  };

  const run = async (reason: SyncRunReason): Promise<SyncRunOutcome> => {
    const outcome: SyncRunOutcome = { status: 'completed', errorCode: null, pushed: 0, pulled: 0, conflicts: 0 };
    controller = new AbortController();
    const { signal } = controller;
    setState({ phase: 'syncing', lastReason: reason });
    try {
      if (!(await connectivity.isOnline())) {
        throw new SyncError('offline', 'MacroZone is offline.');
      }
      for (let round = 0; round < maxRounds; round += 1) {
        const blocked = await pushAll(signal, outcome);
        await pullAll(signal, outcome);
        const summary = await store.summarize();
        if (blocked || summary.pendingCount === 0) {
          break;
        }
      }
      await store.recordRunResult({ now: now(), errorCode: null, blockedReason: null });
    } catch (error) {
      const code = errorCodeOf(error);
      outcome.status = code === 'cancelled' || code === 'scope_changed' ? 'cancelled' : 'failed';
      outcome.errorCode = code;
      if (outcome.status === 'failed') {
        try {
          await store.recordRunResult({ now: now(), errorCode: code, blockedReason: blockedReasonOf(code) });
        } catch {
          outcome.errorCode = code;
        }
      }
    } finally {
      controller = null;
      setState({ phase: 'idle', lastOutcome: outcome });
    }
    return outcome;
  };

  return {
    getState: (): SyncCoordinatorState => state,

    requestSync: async (reason: SyncRunReason): Promise<SyncRunOutcome> => {
      if (stopped) {
        return { status: 'skipped', errorCode: null, pushed: 0, pulled: 0, conflicts: 0 };
      }
      if (running !== null) {
        return running;
      }
      const pending = run(reason).finally(() => {
        running = null;
      });
      running = pending;
      return pending;
    },

    stop: (): void => {
      stopped = true;
      controller?.abort();
    },

    isStopped: (): boolean => stopped,
  };
}

export type SyncCoordinator = ReturnType<typeof createSyncCoordinator>;
