import type { DiaryLogRepository } from '@/features/meals/repositories/diaryLogRepository';
import { loadReadyMealDatabase } from '@/features/meals/repositories/getMealRepository';
import { createSqliteDiaryLogRepository } from '@/features/meals/repositories/sqliteDiaryLogRepository';
import { localDataWriteQueue } from '@/storage/database/writeQueue';

const repository = createSqliteDiaryLogRepository(loadReadyMealDatabase, { queue: localDataWriteQueue });

export function getDiaryLogRepository(): DiaryLogRepository {
  return repository;
}
