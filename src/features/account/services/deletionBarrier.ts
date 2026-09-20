export type DeletionStage = 'copied' | 'deleting' | 'unconfirmed';

export type DeletionMode = 'copy_to_guest' | 'remove';

export type PendingDeletion = {
  accountKey: string;
  mode: DeletionMode;
  stage: DeletionStage;
  fingerprint: string | null;
  copiedAt: string | null;
  updatedAt: string;
  attempts: number;
  lastErrorCode: string | null;
};

export class AccountDeletionPendingError extends Error {
  readonly code = 'deletion_pending';

  constructor() {
    super('This account is waiting for deletion to finish, so it cannot be changed.');
    this.name = 'AccountDeletionPendingError';
  }
}

export type PendingDeletionStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export const PENDING_DELETION_KEY = 'macrozone.pendingDeletion';

const STAGES: readonly DeletionStage[] = ['copied', 'deleting', 'unconfirmed'];

const MODES: readonly DeletionMode[] = ['copy_to_guest', 'remove'];

export function parsePendingDeletion(raw: string | null): PendingDeletion | null {
  if (raw === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const record = parsed as Partial<PendingDeletion>;
    if (
      typeof record.accountKey !== 'string' ||
      !/^[0-9a-f]{8,64}$/.test(record.accountKey) ||
      !MODES.includes(record.mode as DeletionMode) ||
      !STAGES.includes(record.stage as DeletionStage)
    ) {
      return null;
    }
    return {
      accountKey: record.accountKey,
      mode: record.mode as DeletionMode,
      stage: record.stage as DeletionStage,
      fingerprint: typeof record.fingerprint === 'string' ? record.fingerprint : null,
      copiedAt: typeof record.copiedAt === 'string' ? record.copiedAt : null,
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
      attempts: typeof record.attempts === 'number' && Number.isFinite(record.attempts) ? record.attempts : 0,
      lastErrorCode: typeof record.lastErrorCode === 'string' ? record.lastErrorCode : null,
    };
  } catch {
    return null;
  }
}

export function createDeletionBarrier({
  store,
  now = () => new Date(),
}: {
  store: PendingDeletionStore;
  now?: () => Date;
}) {
  let pending: PendingDeletion | null = null;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of [...listeners]) {
      listener();
    }
  };

  const persist = async (next: PendingDeletion | null): Promise<void> => {
    pending = next;
    if (next === null) {
      await store.removeItem(PENDING_DELETION_KEY);
    } else {
      await store.setItem(PENDING_DELETION_KEY, JSON.stringify(next));
    }
    notify();
  };

  return {
    getPending: (): PendingDeletion | null => pending,

    isBlocked: (accountKey?: string): boolean =>
      pending !== null && (accountKey === undefined || pending.accountKey === accountKey),

    load: async (): Promise<PendingDeletion | null> => {
      try {
        pending = parsePendingDeletion(await store.getItem(PENDING_DELETION_KEY));
      } catch {
        pending = null;
      }
      notify();
      return pending;
    },

    engage: async (input: {
      accountKey: string;
      mode: DeletionMode;
      stage: DeletionStage;
      fingerprint: string | null;
      copiedAt: string | null;
    }): Promise<PendingDeletion> => {
      const record: PendingDeletion = {
        ...input,
        updatedAt: now().toISOString(),
        attempts: pending !== null && pending.accountKey === input.accountKey ? pending.attempts : 0,
        lastErrorCode: null,
      };
      await persist(record);
      return record;
    },

    update: async (patch: Partial<Omit<PendingDeletion, 'accountKey'>>): Promise<void> => {
      if (pending === null) {
        return;
      }
      await persist({ ...pending, ...patch, updatedAt: now().toISOString() });
    },

    countAttempt: async (errorCode: string | null): Promise<void> => {
      if (pending === null) {
        return;
      }
      await persist({ ...pending, attempts: pending.attempts + 1, lastErrorCode: errorCode, updatedAt: now().toISOString() });
    },

    clear: async (): Promise<void> => {
      if (pending === null) {
        return;
      }
      await persist(null);
    },

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type DeletionBarrier = ReturnType<typeof createDeletionBarrier>;
