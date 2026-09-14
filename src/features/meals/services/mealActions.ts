import { getMealRepository } from '@/features/meals/repositories/getMealRepository';
import {
  MealRepositoryError,
  type MealRepository,
} from '@/features/meals/repositories/mealRepository';
import type { Meal, MealInput } from '@/features/meals/types';
import {
  validateMealForm,
  type MealFormErrors,
  type MealFormValues,
} from '@/features/meals/validation/mealForm';
import {
  confirmDestructiveAction,
  type ConfirmDestructiveActionOptions,
} from '@/utils/confirm';
import { formatDayLabel, type LocalDateKey } from '@/utils/date';

export type ConfirmAction = (options: ConfirmDestructiveActionOptions) => Promise<boolean>;

export type MealFormSubmitResult =
  | { status: 'invalid'; errors: MealFormErrors }
  | { status: 'saved'; meal: Meal }
  | { status: 'failed'; message: string };

export type DestructiveActionResult = 'completed' | 'cancelled';

export function getMealErrorMessage(error: unknown, fallback: string): string {
  return error instanceof MealRepositoryError ? error.message : fallback;
}

export function saveNewMeal(
  input: MealInput,
  repository: MealRepository = getMealRepository(),
): Promise<Meal> {
  return repository.createMeal(input);
}

export function saveMealChanges(
  id: string,
  input: MealInput,
  repository: MealRepository = getMealRepository(),
): Promise<Meal> {
  return repository.updateMeal(id, input);
}

export function loadAllMeals(repository: MealRepository = getMealRepository()): Promise<Meal[]> {
  return repository.listMeals();
}

export function countLoggedMeals(repository: MealRepository = getMealRepository()): Promise<number> {
  return repository.countMeals();
}

export function loadMeal(
  id: string,
  repository: MealRepository = getMealRepository(),
): Promise<Meal | null> {
  return repository.getMealById(id);
}

export async function submitMealForm(
  values: MealFormValues,
  {
    todayKey,
    save,
  }: { todayKey: LocalDateKey; save: (input: MealInput) => Promise<Meal> },
): Promise<MealFormSubmitResult> {
  const validation = validateMealForm(values, todayKey);
  if (!validation.ok) {
    return { status: 'invalid', errors: validation.errors };
  }
  try {
    const meal = await save(validation.input);
    return { status: 'saved', meal };
  } catch (error) {
    return {
      status: 'failed',
      message: getMealErrorMessage(error, 'Could not save the meal. Please try again.'),
    };
  }
}

function pluralizeMeals(count: number): string {
  return count === 1 ? '1 meal' : `${count} meals`;
}

export function buildDeleteMealConfirmation(meal: Meal): ConfirmDestructiveActionOptions {
  return {
    title: 'Delete Meal',
    message: `Delete "${meal.name}"? This can't be undone.`,
    confirmLabel: 'Delete',
  };
}

export function buildClearDayConfirmation(
  dateKey: LocalDateKey,
  todayKey: LocalDateKey,
  mealCount: number,
): ConfirmDestructiveActionOptions {
  return {
    title: 'Clear Day',
    message: `Delete ${pluralizeMeals(mealCount)} logged for ${formatDayLabel(dateKey, todayKey)}? This can't be undone.`,
    confirmLabel: 'Clear Day',
  };
}

export function buildDeleteAllConfirmation(mealCount: number): ConfirmDestructiveActionOptions {
  return {
    title: 'Delete All History',
    message: `Delete all ${pluralizeMeals(mealCount)} from every day? This can't be undone.`,
    confirmLabel: 'Delete All',
  };
}

export async function confirmAndDeleteMeal(
  meal: Meal,
  {
    confirm = confirmDestructiveAction,
    remove = (id: string) => getMealRepository().deleteMeal(id),
  }: { confirm?: ConfirmAction; remove?: (id: string) => Promise<void> } = {},
): Promise<DestructiveActionResult> {
  if (!(await confirm(buildDeleteMealConfirmation(meal)))) {
    return 'cancelled';
  }
  await remove(meal.id);
  return 'completed';
}

export async function confirmAndClearDay(
  { dateKey, todayKey, mealCount }: { dateKey: LocalDateKey; todayKey: LocalDateKey; mealCount: number },
  {
    confirm = confirmDestructiveAction,
    removeForDate = (date: LocalDateKey) => getMealRepository().deleteMealsForDate(date),
  }: {
    confirm?: ConfirmAction;
    removeForDate?: (dateKey: LocalDateKey) => Promise<number>;
  } = {},
): Promise<DestructiveActionResult> {
  if (mealCount === 0) {
    return 'cancelled';
  }
  if (!(await confirm(buildClearDayConfirmation(dateKey, todayKey, mealCount)))) {
    return 'cancelled';
  }
  await removeForDate(dateKey);
  return 'completed';
}

export async function confirmAndDeleteAllMeals(
  mealCount: number,
  {
    confirm = confirmDestructiveAction,
    removeAll = () => getMealRepository().deleteAllMeals(),
  }: { confirm?: ConfirmAction; removeAll?: () => Promise<unknown> } = {},
): Promise<DestructiveActionResult> {
  if (mealCount === 0) {
    return 'cancelled';
  }
  if (!(await confirm(buildDeleteAllConfirmation(mealCount)))) {
    return 'cancelled';
  }
  await removeAll();
  return 'completed';
}
