import AsyncStorage from '@react-native-async-storage/async-storage';

import { GUEST_SCOPE, isSameScope, type AccountScope, type LocalAccountDatabaseManager } from '@/features/account/types';
import { accountStoragePrefix } from '@/features/account/utils/accountKey';
import type { SqlDatabase } from '@/storage/database/types';

export function createWebAccountDatabaseManager({
  listKeys = () => AsyncStorage.getAllKeys().then((keys) => [...keys]),
  removeKeys = (keys: string[]) => AsyncStorage.multiRemove(keys),
}: {
  listKeys?: () => Promise<string[]>;
  removeKeys?: (keys: string[]) => Promise<void>;
} = {}): LocalAccountDatabaseManager {
  let scope: AccountScope = GUEST_SCOPE;
  let epoch = 0;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of [...listeners]) {
      listener();
    }
  };

  return {
    getActiveScope: () => scope,

    getEpoch: () => epoch,

    getDatabase: (): Promise<SqlDatabase> =>
      Promise.reject(new Error('MacroZone uses browser storage on the web, not a local database file.')),

    activate: (next) => {
      if (!isSameScope(next, scope)) {
        epoch += 1;
        scope = next;
        notify();
      }
      return Promise.resolve();
    },

    closeActive: () => {
      epoch += 1;
      notify();
      return Promise.resolve();
    },

    deleteAccountData: async (accountKey) => {
      if (scope.kind === 'account' && scope.accountKey === accountKey) {
        throw new Error('Switch away from an account before deleting its local data.');
      }
      const prefix = accountStoragePrefix(accountKey);
      const keys = (await listKeys()).filter((key) => key.startsWith(prefix));
      if (keys.length > 0) {
        await removeKeys(keys);
      }
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

let manager: LocalAccountDatabaseManager | null = null;

export function getAccountDatabaseManager(): LocalAccountDatabaseManager {
  manager ??= createWebAccountDatabaseManager();
  return manager;
}
