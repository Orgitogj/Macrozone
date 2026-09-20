import AsyncStorage from '@react-native-async-storage/async-storage';

import { setAccountWriteBlock } from '@/features/account/services/accountWriteBlock';
import { createDeletionBarrier, type DeletionBarrier } from '@/features/account/services/deletionBarrier';

let barrier: DeletionBarrier | null = null;

export function getDeletionBarrier(): DeletionBarrier {
  if (barrier === null) {
    const created = createDeletionBarrier({
      store: {
        getItem: (key) => AsyncStorage.getItem(key),
        setItem: (key, value) => AsyncStorage.setItem(key, value),
        removeItem: (key) => AsyncStorage.removeItem(key),
      },
    });
    setAccountWriteBlock((accountKey) => created.isBlocked(accountKey));
    barrier = created;
  }
  return barrier;
}
