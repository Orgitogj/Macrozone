import { migrateSchema } from '@/storage/database/schemaMigrations';
import type { SqlDatabase } from '@/storage/database/types';

export async function prepareDatabase(database: SqlDatabase): Promise<SqlDatabase> {
  await database.execAsync('PRAGMA journal_mode = WAL');
  await migrateSchema(database);
  return database;
}
