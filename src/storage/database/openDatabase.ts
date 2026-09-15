import { openDatabaseAsync } from 'expo-sqlite';

import { enableForeignKeys } from '@/storage/database/connection';
import { prepareDatabase } from '@/storage/database/prepareDatabase';
import type { SqlDatabase } from '@/storage/database/types';

export const DATABASE_NAME = 'macrozone.db';

let databasePromise: Promise<SqlDatabase> | null = null;

export function getDatabase(): Promise<SqlDatabase> {
  if (databasePromise === null) {
    databasePromise = (async () => {
      const connection = await openDatabaseAsync(DATABASE_NAME);
      try {
        await enableForeignKeys(connection);
        return await prepareDatabase(connection);
      } catch (error) {
        await connection.closeAsync().catch(() => undefined);
        throw error;
      }
    })();
    databasePromise.catch(() => {
      databasePromise = null;
    });
  }
  return databasePromise;
}
