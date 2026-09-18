import { getAccountDatabaseManager } from '@/features/account/repositories/getAccountDatabaseManager';
import { GUEST_DATABASE_NAME } from '@/features/account/repositories/localAccountDatabaseManager';
import type { SqlDatabase } from '@/storage/database/types';

export const DATABASE_NAME = GUEST_DATABASE_NAME;

export function getDatabase(): Promise<SqlDatabase> {
  return getAccountDatabaseManager().getDatabase();
}
