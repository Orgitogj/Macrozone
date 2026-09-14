import { openDatabaseAsync } from 'expo-sqlite';

import { prepareDatabase } from '@/storage/database/prepareDatabase';
import type { SqlDatabase } from '@/storage/database/types';

export const DATABASE_NAME = 'macrozone.db';

let databasePromise: Promise<SqlDatabase> | null = null;

export function getDatabase(): Promise<SqlDatabase> {
  if (databasePromise === null) {
    databasePromise = (async () => {
      const database = await openDatabaseAsync(DATABASE_NAME);
      try {
        return await prepareDatabase(database);
      } catch (error) {
        await database.closeAsync().catch(() => undefined);
        throw error;
      }
    })();
    databasePromise.catch(() => {
      databasePromise = null;
    });
  }
  return databasePromise;
}
