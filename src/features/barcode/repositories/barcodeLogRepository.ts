import type { Food, FoodInput } from '@/features/library/types';
import type { Meal, MealInput, NewProductEntrySource, ProductMealEntrySource } from '@/features/meals/types';
import { MACRO_KEYS } from '@/types/nutrition';

export type BarcodeFoodAction =
  | { kind: 'none' }
  | { kind: 'create'; input: FoodInput }
  | { kind: 'keep_linked'; foodId: string }
  | { kind: 'update_linked'; foodId: string; input: FoodInput };

export type FoodSaveOutcome = 'none' | 'created' | 'reused_existing' | 'linked' | 'updated';

export type BarcodeLogCommand = {
  operationId: string;
  meal: MealInput;
  source: Omit<NewProductEntrySource, 'foodId'>;
  foodAction: BarcodeFoodAction;
};

export type BarcodeLogCommitResult = {
  meal: Meal;
  food: Food | null;
  foodOutcome: FoodSaveOutcome;
  replayed: boolean;
};

export type BarcodeLogErrorCode =
  | 'invalid_data'
  | 'linked_food_missing'
  | 'barcode_linked_elsewhere'
  | 'duplicate_food'
  | 'operation_conflict'
  | 'unsupported_version'
  | 'read_failed'
  | 'write_failed'
  | 'compensation_failed';

export class BarcodeLogError extends Error {
  readonly code: BarcodeLogErrorCode;

  constructor(code: BarcodeLogErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'BarcodeLogError';
    this.code = code;
  }
}

export type BarcodeLogRepository = {
  commit(command: BarcodeLogCommand): Promise<BarcodeLogCommitResult>;
};

export const BARCODE_LOG_MESSAGES: Readonly<Record<BarcodeLogErrorCode, string>> = {
  invalid_data: 'Some values could not be saved. Nothing was added.',
  linked_food_missing: 'Your linked food no longer exists. Nothing was added. Review the product again.',
  barcode_linked_elsewhere: 'This barcode is now linked to a different food in My Foods. Nothing was added.',
  duplicate_food: 'Another food in My Foods already has exactly these values. Nothing was added.',
  operation_conflict: 'This product was already added with different values. Nothing new was added.',
  unsupported_version: 'Your saved data was created by a newer version of MacroZone. Nothing was added.',
  read_failed: 'Could not read your data on this device. Nothing was added.',
  write_failed: 'Could not add this product. Nothing was added. Try again.',
  compensation_failed:
    'MacroZone could not finish saving and could not fully undo the change. Check your diary and My Foods before trying again.',
};

export function isMatchingReplay(existingMeal: Meal, existingSource: ProductMealEntrySource | null, command: BarcodeLogCommand): boolean {
  return (
    existingSource !== null &&
    existingSource.barcode === command.source.barcode &&
    existingSource.amount === command.source.amount &&
    existingMeal.name === command.meal.name &&
    existingMeal.date === command.meal.date &&
    existingMeal.mealType === command.meal.mealType &&
    MACRO_KEYS.every((key) => existingMeal[key] === command.meal[key])
  );
}
