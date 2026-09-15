import { LIBRARY_MESSAGES } from '@/features/library/constants';
import {
  LibraryRepositoryError,
  toLibraryRepositoryError,
} from '@/features/library/repositories/libraryRepositories';
import type { SqlDatabase } from '@/storage/database/types';
import { createId } from '@/utils/id';
import type { SerialQueue } from '@/utils/serialQueue';

export type SqliteLibraryOptions = {
  queue?: SerialQueue;
  generateId?: () => string;
  now?: () => Date;
};

export function createIdGenerator(generateId: () => string = createId) {
  return (): string => {
    try {
      return generateId();
    } catch (error) {
      throw new LibraryRepositoryError('id_generation_failed', LIBRARY_MESSAGES.idGenerationFailed, { cause: error });
    }
  };
}

export function createSqliteAccess(getDatabase: () => Promise<SqlDatabase>, queue: SerialQueue) {
  return {
    read: async <T>(task: (database: SqlDatabase) => Promise<T>): Promise<T> => {
      try {
        return await task(await getDatabase());
      } catch (error) {
        throw toLibraryRepositoryError(error, 'read_failed', LIBRARY_MESSAGES.readFailed);
      }
    },
    write: <T>(task: (database: SqlDatabase) => Promise<T>): Promise<T> =>
      queue.run(async () => {
        try {
          return await task(await getDatabase());
        } catch (error) {
          throw toLibraryRepositoryError(error, 'write_failed', LIBRARY_MESSAGES.writeFailed);
        }
      }),
  };
}

export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}
