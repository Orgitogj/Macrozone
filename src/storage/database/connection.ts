import type { SqlExecutor } from '@/storage/database/types';

export class DatabaseInitializationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DatabaseInitializationError';
  }
}

export type ForeignKeyViolation = {
  table: string;
  rowid: number | null;
  parent: string;
  fkid: number;
};

export async function readForeignKeysEnabled(executor: SqlExecutor): Promise<boolean> {
  const row = await executor.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys', []);
  return Number(row?.foreign_keys) === 1;
}

export async function assertForeignKeysEnabled(executor: SqlExecutor): Promise<void> {
  if (!(await readForeignKeysEnabled(executor))) {
    throw new DatabaseInitializationError('Database integrity checks (foreign keys) are not enabled on this connection.');
  }
}

export async function enableForeignKeys(executor: SqlExecutor): Promise<void> {
  try {
    await executor.execAsync('PRAGMA foreign_keys = ON');
  } catch (error) {
    throw new DatabaseInitializationError('Could not enable database integrity checks (foreign keys).', { cause: error });
  }
  await assertForeignKeysEnabled(executor);
}

export async function findForeignKeyViolations(executor: SqlExecutor): Promise<ForeignKeyViolation[]> {
  return executor.getAllAsync<ForeignKeyViolation>('PRAGMA foreign_key_check', []);
}
