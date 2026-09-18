import { GUEST_SCOPE, isSameScope, type AccountScope } from '@/features/account/types';

export type AccountScopeStore = {
  getScope(): AccountScope;
  getEpoch(): number;
  setScope(scope: AccountScope): void;
  subscribe(listener: () => void): () => void;
};

export function createAccountScopeStore(initial: AccountScope = GUEST_SCOPE): AccountScopeStore {
  let scope = initial;
  let epoch = 0;
  const listeners = new Set<() => void>();

  return {
    getScope: () => scope,
    getEpoch: () => epoch,
    setScope: (next) => {
      if (isSameScope(next, scope)) {
        return;
      }
      scope = next;
      epoch += 1;
      for (const listener of [...listeners]) {
        listener();
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

let store: AccountScopeStore | null = null;

export function getAccountScopeStore(): AccountScopeStore {
  store ??= createAccountScopeStore();
  return store;
}
