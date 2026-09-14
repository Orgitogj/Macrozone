import type { Meal, MealInput } from '@/features/meals/types';
import type { LocalDateKey } from '@/utils/date';

export type MealRepositoryErrorCode =
  | 'not_found'
  | 'read_failed'
  | 'write_failed'
  | 'id_generation_failed'
  | 'migration_failed';

export class MealRepositoryError extends Error {
  readonly code: MealRepositoryErrorCode;

  constructor(code: MealRepositoryErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MealRepositoryError';
    this.code = code;
  }
}

export type MealRepository = {
  listMeals(): Promise<Meal[]>;
  getMealById(id: string): Promise<Meal | null>;
  createMeal(input: MealInput): Promise<Meal>;
  updateMeal(id: string, input: MealInput): Promise<Meal>;
  deleteMeal(id: string): Promise<void>;
  deleteMealsForDate(date: LocalDateKey): Promise<number>;
  deleteAllMeals(): Promise<number>;
};

export const MEAL_REPOSITORY_MESSAGES = {
  notFound: 'This meal no longer exists.',
  readFailed: 'Could not read your meals from this device.',
  writeFailed: 'Could not save your changes on this device.',
  idGenerationFailed: 'Could not create a unique ID for this meal. Please try again.',
  migrationFailed: 'Could not prepare your meal data. Please try again.',
} as const;

export function toMealRepositoryError(
  error: unknown,
  code: MealRepositoryErrorCode,
  message: string,
): MealRepositoryError {
  return error instanceof MealRepositoryError
    ? error
    : new MealRepositoryError(code, message, { cause: error });
}
