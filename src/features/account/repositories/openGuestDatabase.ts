import { openDatabaseAsync } from 'expo-sqlite';

import { GUEST_DATABASE_NAME } from '@/features/account/repositories/localAccountDatabaseManager';
import { createSerializedSqlDatabase, enableForeignKeys } from '@/storage/database/connection';
import { prepareDatabase } from '@/storage/database/prepareDatabase';
import type { SqlDatabase } from '@/storage/database/types';

let pending: Promise<SqlDatabase> | null = null;

export function openGuestDatabase(): Promise<SqlDatabase> {
  pending ??= (async () => {
    const connection = await openDatabaseAsync(GUEST_DATABASE_NAME);
    try {
      await enableForeignKeys(connection);
      const database = createSerializedSqlDatabase(connection);
      return await prepareDatabase(database);
    } catch (error) {
      await connection.closeAsync().catch(() => undefined);
      pending = null;
      throw error;
    }
  })();
  return pending;
}
