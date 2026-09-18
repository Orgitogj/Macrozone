import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { AppState } from 'react-native';

import { getAccountDatabaseManager } from '@/features/account/repositories/getAccountDatabaseManager';
import { openGuestDatabase } from '@/features/account/repositories/openGuestDatabase';
import { getAccountScopeStore } from '@/features/account/services/accountScopeStore';
import { createAccountServices, type AccountServices } from '@/features/account/services/accountServices';
import { createAccountToGuestCopyService } from '@/features/account/services/accountToGuestCopyService';
import { createGuestImportService } from '@/features/account/services/guestImportService';
import { createSupabaseAccountDeletionGateway } from '@/features/account/repositories/supabaseAccountDeletionGateway';
import { getSupabaseClient, getSupabaseConfig } from '@/features/auth/adapters/getSupabaseClient';
import { describeSupabaseConfig } from '@/features/auth/config/supabaseConfig';
import { createNotConfiguredAuthRepository } from '@/features/auth/repositories/notConfiguredAuthRepository';
import { createSupabaseAuthRepository } from '@/features/auth/repositories/supabaseAuthRepository';
import { createAuthService } from '@/features/auth/services/authService';
import { createExpoConnectivityProvider } from '@/features/sync/adapters/connectivityProvider';
import { createSqliteLocalSyncStore } from '@/features/sync/repositories/sqliteLocalSyncStore';
import { createSupabaseCloudSyncRepository } from '@/features/sync/repositories/supabaseCloudSyncRepository';
import { getLocalChangeNotifier, type AppStateSource } from '@/features/sync/services/syncTriggers';

const appStateSource: AppStateSource = {
  subscribe: (listener) => {
    const subscription = AppState.addEventListener('change', (status) => {
      listener(status === 'active');
    });
    return () => subscription.remove();
  },
};

function appOrigins(): string[] {
  try {
    return [new URL(Linking.createURL('')).protocol];
  } catch {
    return [];
  }
}

let services: AccountServices | null = null;

export function getAccountServices(): AccountServices {
  if (services !== null) {
    return services;
  }
  const config = getSupabaseConfig();
  const client = getSupabaseClient();
  const databaseManager = getAccountDatabaseManager();
  const auth = createAuthService({
    repository: client === null ? createNotConfiguredAuthRepository() : createSupabaseAuthRepository(client),
    redirectUrlFor: (path) => Linking.createURL(path),
    allowedOrigins: appOrigins,
  });

  services = createAccountServices({
    auth,
    configured: config.status === 'ready',
    configurationNotice: describeSupabaseConfig(config),
    scopeStore: getAccountScopeStore(),
    databaseManager,
    metadataStore: {
      getItem: (key) => AsyncStorage.getItem(key),
      setItem: (key, value) => AsyncStorage.setItem(key, value),
      removeItem: (key) => AsyncStorage.removeItem(key),
    },
    createLocalStore: (scope) =>
      scope.kind === 'account'
        ? createSqliteLocalSyncStore({ accountKey: scope.accountKey, getDatabase: () => databaseManager.getDatabase() })
        : null,
    createCloud: () => {
      const active = getSupabaseClient();
      return active === null ? null : createSupabaseCloudSyncRepository(active);
    },
    connectivity: createExpoConnectivityProvider(),
    appState: appStateSource,
    localChanges: getLocalChangeNotifier(),
    guestImport: createGuestImportService({
      openGuestDatabase,
      getAccountDatabase: () => databaseManager.getDatabase(),
    }),
    accountCopy: createAccountToGuestCopyService({
      openGuestDatabase,
      getAccountDatabase: () => databaseManager.getDatabase(),
      getAccountKey: () => {
        const scope = getAccountScopeStore().getScope();
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
