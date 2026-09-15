import { LIBRARY_LIMITS } from '@/features/library/constants';
import type {
  Food,
  FoodInput,
} from '@/features/library/types';
import { normalizeLibraryName, toNameKey } from '@/features/library/utils/librarySearch';
import { isServingUnit } from '@/features/library/utils/servingFormat';
import { MACRO_KEYS, type MacroTotals } from '@/types/nutrition';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isValidName(value: unknown): value is string {
  return typeof value === 'string' && normalizeLibraryName(value) === value && value.length > 0 && value.length <= LIBRARY_LIMITS.nameMaxLength;
}

function parseNutrition(value: unknown, perServingLimits: boolean): MacroTotals | null {
  if (!isRecord(value)) {
    return null;
  }
  const result: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const key of MACRO_KEYS) {
    const amount = value[key];
    const max = key === 'calories' ? LIBRARY_LIMITS.maxCaloriesPerServing : LIBRARY_LIMITS.maxMacroGramsPerServing;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || (perServingLimits && amount > max)) {
      return null;
    }
    result[key] = amount;
  }
  return result;
}

export function isValidFoodInput(input: FoodInput): boolean {
  return (
    isValidName(input.name) &&
    isServingUnit(input.serving.unit) &&
    Number.isFinite(input.serving.amount) &&
    input.serving.amount > 0 &&
    input.serving.amount <= LIBRARY_LIMITS.maxServingAmount &&
    parseNutrition(input.nutrition, true) !== null
  );
}

export function parseFoodRecord(value: unknown): Food | null {
  if (!isRecord(value) || !isRecord(value.serving)) {
    return null;
  }
  const { id, name, serving, nutrition, isFavorite, favoritedAt, createdAt, updatedAt } = value;
  const parsedNutrition = parseNutrition(nutrition, true);
  if (
    !isId(id) ||
    typeof name !== 'string' ||
    typeof serving.amount !== 'number' ||
    !isServingUnit(serving.unit) ||
    parsedNutrition === null ||
    typeof isFavorite !== 'boolean' ||
    !(isFavorite ? isTimestamp(favoritedAt) : favoritedAt === null) ||
    !isTimestamp(createdAt) ||
    !isTimestamp(updatedAt)
  ) {
    return null;
  }
  const input: FoodInput = { name, serving: { amount: serving.amount, unit: serving.unit }, nutrition: parsedNutrition };
  if (!isValidFoodInput(input)) {
    return null;
  }
  return { ...input, id, isFavorite, favoritedAt: isFavorite ? (favoritedAt as string) : null, createdAt, updatedAt };
}

export function isSameFoodDefinition(a: FoodInput, b: FoodInput): boolean {
  return (
    toNameKey(a.name) === toNameKey(b.name) &&
    a.serving.unit === b.serving.unit &&
    a.serving.amount === b.serving.amount &&
    MACRO_KEYS.every((key) => a.nutrition[key] === b.nutrition[key])
  );
}
