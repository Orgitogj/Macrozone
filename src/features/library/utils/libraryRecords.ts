import { LIBRARY_LIMITS } from '@/features/library/constants';
import type {
  Food,
  FoodInput,
  FoodPortion,
  FoodPortionInput,
  Recipe,
  RecipeInput,
  SavedMeal,
  SavedMealInput,
} from '@/features/library/types';
import { validatePortionInput } from '@/features/library/validation/portions';
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

export function isValidSavedMealInput(input: SavedMealInput): boolean {
  return (
    isValidName(input.name) &&
    input.items.length > 0 &&
    input.items.length <= LIBRARY_LIMITS.maxSavedMealItems &&
    input.items.every(validatePortionInput)
  );
}

export function isValidRecipeInput(input: RecipeInput): boolean {
  return (
    isValidName(input.name) &&
    Number.isFinite(input.servings) &&
    input.servings > 0 &&
    input.servings <= LIBRARY_LIMITS.maxRecipeServings &&
    input.ingredients.length > 0 &&
    input.ingredients.length <= LIBRARY_LIMITS.maxRecipeIngredients &&
    input.ingredients.every(validatePortionInput)
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

export function parsePortionRecord(value: unknown): FoodPortion | null {
  if (!isRecord(value) || !isRecord(value.serving)) {
    return null;
  }
  const { id, foodId, foodName, serving, nutrition, amount } = value;
  const parsedNutrition = parseNutrition(nutrition, true);
  if (
    !isId(id) ||
    !(foodId === null || isId(foodId)) ||
    typeof foodName !== 'string' ||
    typeof serving.amount !== 'number' ||
    !isServingUnit(serving.unit) ||
    parsedNutrition === null ||
    typeof amount !== 'number'
  ) {
    return null;
  }
  const portion: FoodPortionInput = {
    foodId,
    foodName,
    serving: { amount: serving.amount, unit: serving.unit },
    nutrition: parsedNutrition,
    amount,
  };
  return validatePortionInput(portion) ? { ...portion, id } : null;
}

function parsePortionList(value: unknown, max: number): FoodPortion[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > max) {
    return null;
  }
  const portions = value.map(parsePortionRecord);
  const ids = new Set(portions.map((portion) => portion?.id));
  return portions.every((portion): portion is FoodPortion => portion !== null) && ids.size === portions.length
    ? portions
    : null;
}

export function parseSavedMealRecord(value: unknown): SavedMeal | null {
  if (!isRecord(value)) {
    return null;
  }
  const { id, name, items, createdAt, updatedAt } = value;
  const parsedItems = parsePortionList(items, LIBRARY_LIMITS.maxSavedMealItems);
  if (!isId(id) || !isValidName(name) || parsedItems === null || !isTimestamp(createdAt) || !isTimestamp(updatedAt)) {
    return null;
  }
  return { id, name, items: parsedItems, createdAt, updatedAt };
}

export function parseRecipeRecord(value: unknown): Recipe | null {
  if (!isRecord(value)) {
    return null;
  }
  const { id, name, servings, ingredients, createdAt, updatedAt } = value;
  const parsedIngredients = parsePortionList(ingredients, LIBRARY_LIMITS.maxRecipeIngredients);
  if (
    !isId(id) ||
    !isValidName(name) ||
    typeof servings !== 'number' ||
    !Number.isFinite(servings) ||
    servings <= 0 ||
    servings > LIBRARY_LIMITS.maxRecipeServings ||
    parsedIngredients === null ||
    !isTimestamp(createdAt) ||
    !isTimestamp(updatedAt)
  ) {
    return null;
  }
  return { id, name, servings, ingredients: parsedIngredients, createdAt, updatedAt };
}

export function isSameFoodDefinition(a: FoodInput, b: FoodInput): boolean {
  return (
    toNameKey(a.name) === toNameKey(b.name) &&
    a.serving.unit === b.serving.unit &&
    a.serving.amount === b.serving.amount &&
    MACRO_KEYS.every((key) => a.nutrition[key] === b.nutrition[key])
  );
}

export function buildCopyName(name: string): string {
  const suffix = ' (copy)';
  const base = name.slice(0, LIBRARY_LIMITS.nameMaxLength - suffix.length).trimEnd();
  return `${base}${suffix}`;
}
