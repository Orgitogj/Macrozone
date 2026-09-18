import { deleteDatabaseAsync, openDatabaseAsync } from 'expo-sqlite';

import {
  createLocalAccountDatabaseManager,
  type ManagedDatabase,
} from '@/features/account/repositories/localAccountDatabaseManager';
import type { LocalAccountDatabaseManager } from '@/features/account/types';
import { createSerializedSqlDatabase, enableForeignKeys } from '@/storage/database/connection';
import { getLocalChangeNotifier } from '@/features/sync/services/syncTriggers';
import { prepareDatabase } from '@/storage/database/prepareDatabase';

let manager: LocalAccountDatabaseManager | null = null;

export function getAccountDatabaseManager(): LocalAccountDatabaseManager {
  manager ??= createLocalAccountDatabaseManager({
    open: async (fileName): Promise<ManagedDatabase> => {
      const connection = await openDatabaseAsync(fileName);
      try {
        await enableForeignKeys(connection);
        return createSerializedSqlDatabase(connection);
      } catch (error) {
        await connection.closeAsync().catch(() => undefined);
        throw error;
      }
    },
    prepare: (database) => prepareDatabase(database),
    onAccountWrite: () => getLocalChangeNotifier().notify(),
    deleteDatabase: async (fileName) => {
      await deleteDatabaseAsync(fileName);
    },
  });
  return manager;
}
