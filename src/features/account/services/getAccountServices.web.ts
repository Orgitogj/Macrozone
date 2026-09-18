import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAccountDatabaseManager } from '@/features/account/repositories/getAccountDatabaseManager';
import { getScopedStorage } from '@/features/account/repositories/getScopedStorage';
import { getAccountScopeStore } from '@/features/account/services/accountScopeStore';
import { createAccountServices, type AccountServices } from '@/features/account/services/accountServices';
import { createWebGuestImportService } from '@/features/account/services/webGuestImportService';
import { createWebAccountToGuestCopyService } from '@/features/account/services/webAccountToGuestCopyService';
import { createSupabaseAccountDeletionGateway } from '@/features/account/repositories/supabaseAccountDeletionGateway';
import { getSupabaseClient, getSupabaseConfig } from '@/features/auth/adapters/getSupabaseClient';
import { describeSupabaseConfig } from '@/features/auth/config/supabaseConfig';
import { createNotConfiguredAuthRepository } from '@/features/auth/repositories/notConfiguredAuthRepository';
import { createSupabaseAuthRepository } from '@/features/auth/repositories/supabaseAuthRepository';
import { createAuthService } from '@/features/auth/services/authService';
import { createExpoConnectivityProvider } from '@/features/sync/adapters/connectivityProvider';
import { createWebLocalSyncStore } from '@/features/sync/repositories/webLocalSyncStore';
import { createSupabaseCloudSyncRepository } from '@/features/sync/repositories/supabaseCloudSyncRepository';
import { getLocalChangeNotifier, type AppStateSource } from '@/features/sync/services/syncTriggers';

type DocumentLike = {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
  visibilityState?: string;
};

function browserDocument(): DocumentLike | null {
  const candidate = (globalThis as { document?: DocumentLike }).document;
  return candidate !== undefined && typeof candidate.addEventListener === 'function' ? candidate : null;
}

const appStateSource: AppStateSource = {
  subscribe: (listener) => {
    const target = browserDocument();
    if (target === null) {
      return () => undefined;
    }
    const onVisibilityChange = () => {
      listener(target.visibilityState !== 'hidden');
    };
    target.addEventListener('visibilitychange', onVisibilityChange);
    return () => target.removeEventListener('visibilitychange', onVisibilityChange);
  },
};

function webOrigin(): string {
  const location = (globalThis as { location?: { origin?: string } }).location;
  return location?.origin ?? '';
}

let services: AccountServices | null = null;

export function getAccountServices(): AccountServices {
  if (services !== null) {
    return services;
  }
  const config = getSupabaseConfig();
  const client = getSupabaseClient();
  const databaseManager = getAccountDatabaseManager();
  const scopeStore = getAccountScopeStore();
  const auth = createAuthService({
    repository: client === null ? createNotConfiguredAuthRepository() : createSupabaseAuthRepository(client),
    redirectUrlFor: (path) => `${webOrigin()}/${path}`,
    allowedOrigins: () => (webOrigin() === '' ? [] : [webOrigin()]),
  });

  services = createAccountServices({
    auth,
    configured: config.status === 'ready',
    configurationNotice: describeSupabaseConfig(config),
    scopeStore,
    databaseManager,
    metadataStore: {
      getItem: (key) => AsyncStorage.getItem(key),
      setItem: (key, value) => AsyncStorage.setItem(key, value),
      removeItem: (key) => AsyncStorage.removeItem(key),
    },
    createLocalStore: (scope) =>
      scope.kind === 'account' ? createWebLocalSyncStore({ accountKey: scope.accountKey, storage: getScopedStorage() }) : null,
    createCloud: () => {
      const active = getSupabaseClient();
      return active === null ? null : createSupabaseCloudSyncRepository(active);
    },
    connectivity: createExpoConnectivityProvider(),
    appState: appStateSource,
    localChanges: getLocalChangeNotifier(),
    guestImport: createWebGuestImportService({
      storage: {
        getItem: (key) => AsyncStorage.getItem(key),
        setItem: (key, value) => AsyncStorage.setItem(key, value),
        multiSet: (pairs) => AsyncStorage.multiSet(pairs),
      },
      getAccountKey: () => {
        const scope = scopeStore.getScope();
        return scope.kind === 'account' ? scope.accountKey : null;
      },
    }),
    accountCopy: createWebAccountToGuestCopyService({
      storage: {
        getItem: (key) => AsyncStorage.getItem(key),
        setItem: (key, value) => AsyncStorage.setItem(key, value),
        removeItem: (key) => AsyncStorage.removeItem(key),
        multiSet: (pairs) => AsyncStorage.multiSet(pairs),
      },
      getAccountKey: () => {
        const scope = scopeStore.getScope();
        return scope.kind === 'account' ? scope.accountKey : null;
      },
    }),
    accountDeletion:
      config.status === 'ready'
        ? createSupabaseAccountDeletionGateway({
            functionsUrl: `${config.url}/functions/v1`,
            publishableKey: config.publishableKey,
            getAccessToken: () => auth.getAccessToken(),
          })
        : null,
  });
  return services;
}
