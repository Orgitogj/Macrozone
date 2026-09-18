import { AccountScopeChangedError, type AccountScope } from '@/features/account/types';
import { accountStoragePrefix } from '@/features/account/utils/accountKey';

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiSet?(pairs: [string, string][]): Promise<void>;
  multiRemove?(keys: string[]): Promise<void>;
};

export function scopedKeyFor(scope: AccountScope, key: string): string {
  return scope.kind === 'guest' ? key : `${accountStoragePrefix(scope.accountKey)}${key}`;
}

export function createScopedKeyValueStorage({
  storage,
  getScope,
  getEpoch,
  onAccountWrite,
}: {
  storage: KeyValueStorage;
  getScope: () => AccountScope;
  getEpoch: () => number;
  onAccountWrite?: () => void;
}): KeyValueStorage {
  const notify = () => {
    if (getScope().kind === 'account') {
      onAccountWrite?.();
    }
  };

  const mapKey = (key: string, epoch: number): string => {
    if (getEpoch() !== epoch) {
      throw new AccountScopeChangedError();
    }
    return scopedKeyFor(getScope(), key);
  };

  return {
    getItem: (key) => {
      const epoch = getEpoch();
      return storage.getItem(mapKey(key, epoch));
    },
    setItem: async (key, value) => {
      const epoch = getEpoch();
      await storage.setItem(mapKey(key, epoch), value);
      notify();
    },
    removeItem: async (key) => {
      const epoch = getEpoch();
      await storage.removeItem(mapKey(key, epoch));
      notify();
    },
    multiSet: storage.multiSet
      ? (pairs) => {
          const epoch = getEpoch();
          const mapped = pairs.map(([key, value]): [string, string] => [mapKey(key, epoch), value]);
          return (storage.multiSet?.(mapped) ?? Promise.resolve()).then(notify);
        }
      : undefined,
    multiRemove: storage.multiRemove
      ? (keys) => {
          const epoch = getEpoch();
          const mapped = keys.map((key) => mapKey(key, epoch));
          return storage.multiRemove?.(mapped) ?? Promise.resolve();
        }
      : undefined,
  };
}
