import { assertForeignKeysEnabled, findForeignKeyViolations } from '@/storage/database/connection';
import { migrateSchema } from '@/storage/database/schemaMigrations';
import type { SqlDatabase } from '@/storage/database/types';

export async function prepareDatabase(database: SqlDatabase): Promise<SqlDatabase> {
  await assertForeignKeysEnabled(database);
  await database.execAsync('PRAGMA journal_mode = WAL');
  await migrateSchema(database);
  const violations = await findForeignKeyViolations(database);
  if (violations.length > 0 && __DEV__) {
    console.warn('[database] Foreign key check reported existing violations; no data was changed.', violations);
  }
  return database;
}
