import { LIBRARY_LIMITS } from '@/features/library/constants';
import { getLibraryRepositories } from '@/features/library/repositories/getLibraryRepositories';
import {
  LibraryRepositoryError,
  type FoodRepository,
} from '@/features/library/repositories/libraryRepositories';
import type { Food, FoodListQuery } from '@/features/library/types';
import { validateFoodForm, type FoodFormErrors, type FoodFormValues } from '@/features/library/validation/foodForm';
import { compareCodePoints, toNameKey } from '@/features/library/utils/librarySearch';
import type { DiaryLogRepository } from '@/features/meals/repositories/diaryLogRepository';
import { getDiaryLogRepository } from '@/features/meals/repositories/getDiaryLogRepository';
import { confirmDestructiveAction, type ConfirmDestructiveActionOptions } from '@/utils/confirm';

export type RecentFood = {
  food: Food;
  lastLoggedAt: string;
  suggestedAmount: number;
};

export type FormSubmitResult<TValue, TErrors> =
  | { status: 'saved'; value: TValue }
  | { status: 'invalid'; errors: TErrors }
  | { status: 'failed'; message: string };

export type DeleteResult = { status: 'deleted' } | { status: 'cancelled' } | { status: 'failed'; message: string };

type ConfirmAction = (options: ConfirmDestructiveActionOptions) => Promise<boolean>;

export function getLibraryErrorMessage(error: unknown, fallback: string): string {
  return error instanceof LibraryRepositoryError ? error.message : fallback;
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function buildDeleteFoodMessage(food: Food, references: { savedMeals: number; recipes: number }): string {
  const usage: string[] = [];
  if (references.savedMeals > 0) {
    usage.push(pluralize(references.savedMeals, 'saved meal', 'saved meals'));
  }
  if (references.recipes > 0) {
    usage.push(pluralize(references.recipes, 'recipe', 'recipes'));
  }
  const usageText =
    usage.length > 0 ? ` It is used in ${usage.join(' and ')}, which keep their saved copy of its nutrition.` : '';
  return `Delete "${food.name}" from your food library?${usageText} Meals you already logged are not changed.`;
}

export function createLibraryService({
  foods,
  diary,
  confirm = confirmDestructiveAction,
}: {
  foods: FoodRepository;
  diary: DiaryLogRepository;
  confirm?: ConfirmAction;
}) {
  const runDelete = async (options: ConfirmDestructiveActionOptions, remove: () => Promise<void>, failure: string): Promise<DeleteResult> => {
    if (!(await confirm(options))) {
      return { status: 'cancelled' };
    }
    try {
      await remove();
      return { status: 'deleted' };
    } catch (error) {
      return { status: 'failed', message: getLibraryErrorMessage(error, failure) };
    }
  };

  return {
    listFoods: (query: FoodListQuery) => foods.listFoods(query),
    getFood: (id: string) => foods.getFood(id),

    listRecentFoods: async (limit: number = LIBRARY_LIMITS.recentLimit): Promise<RecentFood[]> => {
      const usage = await diary.listRecentFoodUsage(limit);
      const byId = new Map((await foods.getFoodsByIds(usage.map((entry) => entry.foodId))).map((food) => [food.id, food]));
      return usage
        .flatMap((entry): RecentFood[] => {
          const food = byId.get(entry.foodId);
          if (!food) {
            return [];
          }
          return [
            {
              food,
              lastLoggedAt: entry.lastLoggedAt,
              suggestedAmount: entry.lastServingUnit === food.serving.unit ? entry.lastAmount : food.serving.amount,
            },
          ];
        })
        .sort(
          (a, b) =>
            (a.lastLoggedAt === b.lastLoggedAt ? 0 : a.lastLoggedAt > b.lastLoggedAt ? -1 : 1) ||
            compareCodePoints(toNameKey(a.food.name), toNameKey(b.food.name)) ||
            compareCodePoints(a.food.id, b.food.id),
        );
    },

    saveFood: async (values: FoodFormValues, existingId: string | null): Promise<FormSubmitResult<Food, FoodFormErrors>> => {
      const validation = validateFoodForm(values);
      if (!validation.ok) {
        return { status: 'invalid', errors: validation.errors };
      }
      try {
        const food = existingId
          ? await foods.updateFood(existingId, validation.input)
          : await foods.createFood(validation.input);
        return { status: 'saved', value: food };
      } catch (error) {
        return { status: 'failed', message: getLibraryErrorMessage(error, 'Could not save this food. Please try again.') };
      }
    },

    deleteFood: async (food: Food): Promise<DeleteResult> => {
      let references = { savedMeals: 0, recipes: 0 };
      try {
        references = await foods.countReferences(food.id);
      } catch (error) {
        return { status: 'failed', message: getLibraryErrorMessage(error, 'Could not check where this food is used.') };
      }
      return runDelete(
        { title: 'Delete Food', message: buildDeleteFoodMessage(food, references), confirmLabel: 'Delete' },
        () => foods.deleteFood(food.id),
        'Could not delete this food. Please try again.',
      );
    },
  };
}

export type LibraryService = ReturnType<typeof createLibraryService>;

let defaultService: LibraryService | null = null;

export function getLibraryService(): LibraryService {
  if (defaultService === null) {
    const repositories = getLibraryRepositories();
    defaultService = createLibraryService({ ...repositories, diary: getDiaryLogRepository() });
  }
  return defaultService;
}
