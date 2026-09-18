import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAccountScopeStore } from '@/features/account/services/accountScopeStore';
import { createScopedKeyValueStorage, type KeyValueStorage } from '@/features/account/repositories/scopedKeyValueStorage';
import { getLocalChangeNotifier } from '@/features/sync/services/syncTriggers';

let scopedStorage: KeyValueStorage | null = null;

export function getScopedStorage(): KeyValueStorage {
  scopedStorage ??= createScopedKeyValueStorage({
    storage: {
      getItem: (key) => AsyncStorage.getItem(key),
      setItem: (key, value) => AsyncStorage.setItem(key, value),
      removeItem: (key) => AsyncStorage.removeItem(key),
      multiSet: (pairs) => AsyncStorage.multiSet(pairs),
      multiRemove: (keys) => AsyncStorage.multiRemove(keys),
    },
    getScope: () => getAccountScopeStore().getScope(),
    getEpoch: () => getAccountScopeStore().getEpoch(),
    onAccountWrite: () => getLocalChangeNotifier().notify(),
  });
  return scopedStorage;
}
