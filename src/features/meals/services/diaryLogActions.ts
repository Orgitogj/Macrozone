import type { Food, SavedMeal } from '@/features/library/types';
import type { DiaryLogRepository } from '@/features/meals/repositories/diaryLogRepository';
import { getDiaryLogRepository } from '@/features/meals/repositories/getDiaryLogRepository';
import { getMealErrorMessage } from '@/features/meals/services/mealActions';
import type { Meal, MealEntrySource } from '@/features/meals/types';
import {
  buildFoodEntry,
  buildSavedMealEntries,
  type EntryBuildResult,
  type LogDestination,
} from '@/features/meals/utils/libraryEntries';
import type { LocalDateKey } from '@/utils/date';

export type LogResult = { status: 'logged'; meals: Meal[] } | { status: 'invalid'; message: string } | { status: 'failed'; message: string };

export function createDiaryLogService({
  repository = getDiaryLogRepository(),
}: { repository?: DiaryLogRepository } = {}) {
  const log = async (built: EntryBuildResult, group: boolean, failure: string): Promise<LogResult> => {
    if (!built.ok) {
      return { status: 'invalid', message: built.message };
    }
    try {
      const meals = await repository.logEntries(built.entries, { group });
      return { status: 'logged', meals };
    } catch (error) {
      return { status: 'failed', message: getMealErrorMessage(error, failure) };
    }
  };

  return {
    logFood: (food: Food, amount: number, destination: LogDestination, todayKey: LocalDateKey) =>
      log(buildFoodEntry(food, amount, destination, todayKey), false, 'Could not add this food. Please try again.'),

    logSavedMeal: (savedMeal: SavedMeal, destination: LogDestination, todayKey: LocalDateKey) =>
      log(buildSavedMealEntries(savedMeal, destination, todayKey), true, 'Could not add this saved meal. Nothing was added.'),

    getEntrySource: (mealId: string): Promise<MealEntrySource | null> => repository.getEntrySource(mealId),
  };
}

export type DiaryLogService = ReturnType<typeof createDiaryLogService>;

let defaultService: DiaryLogService | null = null;

export function getDiaryLogService(): DiaryLogService {
  defaultService ??= createDiaryLogService();
  return defaultService;
}
