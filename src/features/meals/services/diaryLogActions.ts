import type { Food, Recipe, SavedMeal } from '@/features/library/types';
import type { DiaryLogRepository } from '@/features/meals/repositories/diaryLogRepository';
import { getDiaryLogRepository } from '@/features/meals/repositories/getDiaryLogRepository';
import { getMealErrorMessage, type ConfirmAction } from '@/features/meals/services/mealActions';
import type { Meal, MealEntrySource } from '@/features/meals/types';
import {
  buildFoodEntry,
  buildRecipeEntry,
  buildSavedMealEntries,
  validateDestination,
  type EntryBuildResult,
  type LogDestination,
} from '@/features/meals/utils/libraryEntries';
import { confirmDestructiveAction } from '@/utils/confirm';
import { formatDayLabel, type LocalDateKey } from '@/utils/date';

export type LogResult = { status: 'logged'; meals: Meal[] } | { status: 'invalid'; message: string } | { status: 'failed'; message: string };

export type CopyDayResult =
  | { status: 'copied'; meals: Meal[] }
  | { status: 'cancelled' }
  | { status: 'invalid'; message: string }
  | { status: 'failed'; message: string };

function pluralize(count: number): string {
  return count === 1 ? '1 meal' : `${count} meals`;
}

export function createDiaryLogService({
  repository = getDiaryLogRepository(),
  confirm = confirmDestructiveAction,
}: { repository?: DiaryLogRepository; confirm?: ConfirmAction } = {}) {
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

    logRecipe: (recipe: Recipe, servings: number, destination: LogDestination, todayKey: LocalDateKey) =>
      log(buildRecipeEntry(recipe, servings, destination, todayKey), false, 'Could not add this recipe. Please try again.'),

    getEntrySource: (mealId: string): Promise<MealEntrySource | null> => repository.getEntrySource(mealId),

    copyDay: async ({
      sourceDate,
      destinationDate,
      todayKey,
      mealCount,
    }: {
      sourceDate: LocalDateKey;
      destinationDate: LocalDateKey;
      todayKey: LocalDateKey;
      mealCount: number;
    }): Promise<CopyDayResult> => {
      if (mealCount === 0) {
        return { status: 'invalid', message: 'There are no meals to copy on this day.' };
      }
      if (sourceDate === destinationDate) {
        return { status: 'invalid', message: 'Choose a different day to copy to.' };
      }
      const destinationError = validateDestination({ date: destinationDate, mealType: 'breakfast' }, todayKey);
      if (destinationError) {
        return { status: 'invalid', message: destinationError };
      }
      const confirmed = await confirm({
        title: 'Copy Meals',
        message: `Copy ${pluralize(mealCount)} from ${formatDayLabel(sourceDate, todayKey)} to ${formatDayLabel(destinationDate, todayKey)}? The original meals stay unchanged.`,
        confirmLabel: 'Copy',
        destructive: false,
      });
      if (!confirmed) {
        return { status: 'cancelled' };
      }
      try {
        const meals = await repository.copyEntries({ sourceDate, destinationDate, mealType: null });
        return { status: 'copied', meals };
      } catch (error) {
        return { status: 'failed', message: getMealErrorMessage(error, 'Could not copy these meals. Nothing was copied.') };
      }
    },
  };
}

export type DiaryLogService = ReturnType<typeof createDiaryLogService>;

let defaultService: DiaryLogService | null = null;

export function getDiaryLogService(): DiaryLogService {
  defaultService ??= createDiaryLogService();
  return defaultService;
}
