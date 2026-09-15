import type {
  CopyMealEntriesRequest,
  Meal,
  MealEntrySource,
  NewDiaryEntry,
  RecentFoodUsage,
} from '@/features/meals/types';

export type LogEntriesOptions = {
  group: boolean;
};

export type DiaryLogRepository = {
  logEntries(entries: readonly NewDiaryEntry[], options: LogEntriesOptions): Promise<Meal[]>;
  getEntrySource(mealId: string): Promise<MealEntrySource | null>;
  listRecentFoodUsage(limit: number): Promise<RecentFoodUsage[]>;
  copyEntries(request: CopyMealEntriesRequest): Promise<Meal[]>;
};
