import { AccountScopeChangedError, GUEST_SCOPE, isSameScope, scopeKey, type AccountScope, type LocalAccountDatabaseManager } from '@/features/account/types';
import { accountDatabaseName } from '@/features/account/utils/accountKey';
import type { SqlDatabase, SqlExecutor } from '@/storage/database/types';

export type ManagedDatabase = SqlDatabase & { closeAsync(): Promise<void> };

export type DatabaseOpener = (fileName: string) => Promise<ManagedDatabase>;

export const GUEST_DATABASE_NAME = 'macrozone.db';

export function databaseNameFor(scope: AccountScope): string {
  return scope.kind === 'guest' ? GUEST_DATABASE_NAME : accountDatabaseName(scope.accountKey);
}

async function claimScope(database: SqlDatabase, scope: AccountScope): Promise<void> {
  const row = await database.getFirstAsync<{ scope: string; account_key: string | null }>(
    'SELECT scope, account_key FROM account_database_metadata WHERE id = 1',
    [],
  );
  const expectedKey = scope.kind === 'guest' ? null : scope.accountKey;
  if (row !== null && row.scope === (scope.kind === 'guest' ? 'guest' : 'account') && row.account_key === expectedKey) {
    return;
  }
  if (row !== null && row.scope === 'account' && row.account_key !== expectedKey) {
    throw new Error('This database belongs to a different account.');
  }
  if (scope.kind === 'account') {
    await database.runAsync("UPDATE account_database_metadata SET scope = 'account', account_key = ? WHERE id = 1", [scope.accountKey]);
  }
}

function guard(database: ManagedDatabase, isCurrent: () => boolean, onWrite: () => void): SqlDatabase {
  const check = () => {
    if (!isCurrent()) {
      throw new AccountScopeChangedError();
    }
  };
  return {
    execAsync: async (source) => {
      check();
      return database.execAsync(source);
    },
    runAsync: async (source, params) => {
      check();
      const result = await database.runAsync(source, params);
      onWrite();
      return result;
    },
    getFirstAsync: async <T>(source: string, params: Parameters<SqlExecutor['getFirstAsync']>[1]) => {
      check();
      return database.getFirstAsync<T>(source, params);
    },
    getAllAsync: async <T>(source: string, params: Parameters<SqlExecutor['getAllAsync']>[1]) => {
      check();
      return database.getAllAsync<T>(source, params);
    },
    withExclusiveTransactionAsync: async (task) => {
      check();
      await database.withExclusiveTransactionAsync(async (transaction) => {
        check();
        await task(transaction);
      });
      onWrite();
    },
  };
}

export function createLocalAccountDatabaseManager({
  open,
  prepare,
  deleteDatabase,
  onScopeReady,
  onAccountWrite,
}: {
  open: DatabaseOpener;
  prepare: (database: SqlDatabase) => Promise<SqlDatabase>;
  deleteDatabase?: (fileName: string) => Promise<void>;
  onScopeReady?: (scope: AccountScope) => void;
  onAccountWrite?: () => void;
}): LocalAccountDatabaseManager {
  let scope: AccountScope = GUEST_SCOPE;
  let epoch = 0;
  let active: { epoch: number; raw: ManagedDatabase; guarded: SqlDatabase } | null = null;
  let pending: Promise<SqlDatabase> | null = null;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of [...listeners]) {
      listener();
    }
  };

  const openScope = async (): Promise<SqlDatabase> => {
    const target = epoch;
    const raw = await open(databaseNameFor(scope));
    try {
      await prepare(raw);
      await claimScope(raw, scope);
    } catch (error) {
      await raw.closeAsync().catch(() => undefined);
      throw error;
    }
    if (target !== epoch) {
      await raw.closeAsync().catch(() => undefined);
      throw new AccountScopeChangedError();
    }
    const guarded = guard(
      raw,
      () => active?.epoch === target && epoch === target,
      () => {
        if (scope.kind === 'account') {
          onAccountWrite?.();
        }
      },
    );
    active = { epoch: target, raw, guarded };
    onScopeReady?.(scope);
    return guarded;
  };

  const ensureOpen = (): Promise<SqlDatabase> => {
    if (active !== null && active.epoch === epoch) {
      return Promise.resolve(active.guarded);
    }
    if (pending === null) {
      pending = openScope().finally(() => {
        pending = null;
      });
    }
    return pending;
  };

  const closeActive = async (): Promise<void> => {
    const current = active;
    active = null;
    if (current !== null) {
      await current.raw.closeAsync().catch(() => undefined);
    }
  };

  return {
    getActiveScope: () => scope,

    getEpoch: () => epoch,

    getDatabase: ensureOpen,

    activate: async (next) => {
      if (isSameScope(next, scope) && active !== null) {
        return;
      }
      epoch += 1;
      await closeActive();
      scope = next;
      notify();
      await ensureOpen();
    },

    closeActive: async () => {
      epoch += 1;
      await closeActive();
      notify();
    },

    deleteAccountData: async (accountKey) => {
      if (scope.kind === 'account' && scope.accountKey === accountKey) {
        throw new Error('Switch away from an account before deleting its local data.');
      }
      await deleteDatabase?.(accountDatabaseName(accountKey));
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export { scopeKey };
