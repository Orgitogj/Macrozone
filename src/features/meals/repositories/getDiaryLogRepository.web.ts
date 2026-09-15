import { createAsyncStorageDiaryLogRepository } from '@/features/meals/repositories/asyncStorageDiaryLogRepository';
import type { DiaryLogRepository } from '@/features/meals/repositories/diaryLogRepository';
import { localDataWriteQueue } from '@/storage/database/writeQueue';

const repository = createAsyncStorageDiaryLogRepository({ queue: localDataWriteQueue });

export function getDiaryLogRepository(): DiaryLogRepository {
  return repository;
}
