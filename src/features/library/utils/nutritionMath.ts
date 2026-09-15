import { MEAL_LIMITS } from '@/features/meals/constants';
import type { FoodPortionInput, Serving } from '@/features/library/types';
import { MACRO_KEYS, type MacroTotals } from '@/types/nutrition';

export const NUTRITION_PRECISION = 2;

export class NutritionCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NutritionCalculationError';
  }
}

type PortionLike = Pick<FoodPortionInput, 'serving' | 'nutrition' | 'amount'>;

type RecipeLike = {
  servings: number;
  ingredients: readonly PortionLike[];
};

function isValidNutritionNumber(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function shiftDecimal(value: number, exponent: number): number {
  const [mantissa, power = '0'] = String(value).split('e');
  return Number(`${mantissa}e${Number(power) + exponent}`);
}

export function roundNutritionValue(value: number): number {
  if (!isValidNutritionNumber(value)) {
    throw new NutritionCalculationError('Nutrition values must be finite and not negative.');
  }
  const rounded = shiftDecimal(Math.round(shiftDecimal(value, NUTRITION_PRECISION)), -NUTRITION_PRECISION);
  return rounded === 0 ? 0 : rounded;
}

export function assertValidNutrition(values: MacroTotals): MacroTotals {
  for (const key of MACRO_KEYS) {
    if (!isValidNutritionNumber(values[key])) {
      throw new NutritionCalculationError(`The ${key} value is invalid.`);
    }
  }
  return values;
}

export function roundNutrition(values: MacroTotals): MacroTotals {
  assertValidNutrition(values);
  return {
    calories: roundNutritionValue(values.calories),
    protein: roundNutritionValue(values.protein),
    carbs: roundNutritionValue(values.carbs),
    fat: roundNutritionValue(values.fat),
  };
}

export function scaleNutrition(values: MacroTotals, factor: number): MacroTotals {
  if (!Number.isFinite(factor) || factor < 0) {
    throw new NutritionCalculationError('The quantity multiplier is invalid.');
  }
  assertValidNutrition(values);
  return assertValidNutrition({
    calories: values.calories * factor,
    protein: values.protein * factor,
    carbs: values.carbs * factor,
    fat: values.fat * factor,
  });
}

export function sumNutrition(values: readonly MacroTotals[]): MacroTotals {
  const totals: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const value of values) {
    assertValidNutrition(value);
    for (const key of MACRO_KEYS) {
      totals[key] += value[key];
    }
  }
  return assertValidNutrition(totals);
}

export function calculateServingMultiplier(serving: Serving, amount: number): number {
  if (!Number.isFinite(serving.amount) || serving.amount <= 0) {
    throw new NutritionCalculationError('The serving size must be greater than zero.');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new NutritionCalculationError('The quantity must be greater than zero.');
  }
  return amount / serving.amount;
}

export function calculatePortionNutrition(portion: PortionLike): MacroTotals {
  return scaleNutrition(portion.nutrition, calculateServingMultiplier(portion.serving, portion.amount));
}

export function calculateLoggedPortionNutrition(portion: PortionLike): MacroTotals {
  return roundNutrition(calculatePortionNutrition(portion));
}

export function calculateSavedMealNutrition(items: readonly PortionLike[]): MacroTotals {
  return roundNutrition(sumNutrition(items.map(calculateLoggedPortionNutrition)));
}

function assertValidServings(servings: number): void {
  if (!Number.isFinite(servings) || servings <= 0) {
    throw new NutritionCalculationError('The number of servings must be greater than zero.');
  }
}

export function calculateRecipeTotalUnrounded(recipe: RecipeLike): MacroTotals {
  return sumNutrition(recipe.ingredients.map(calculatePortionNutrition));
}

export function calculateRecipeNutrition(recipe: RecipeLike): { total: MacroTotals; perServing: MacroTotals } {
  assertValidServings(recipe.servings);
  const total = calculateRecipeTotalUnrounded(recipe);
  return {
    total: roundNutrition(total),
    perServing: roundNutrition(scaleNutrition(total, 1 / recipe.servings)),
  };
}

export function calculateLoggedRecipeNutrition(recipe: RecipeLike, servingsLogged: number): MacroTotals {
  assertValidServings(recipe.servings);
  assertValidServings(servingsLogged);
  return roundNutrition(scaleNutrition(calculateRecipeTotalUnrounded(recipe), servingsLogged / recipe.servings));
}

export function exceedsDiaryEntryLimits(values: MacroTotals): boolean {
  return (
    values.calories > MEAL_LIMITS.maxCalories ||
    values.protein > MEAL_LIMITS.maxMacroGrams ||
    values.carbs > MEAL_LIMITS.maxMacroGrams ||
    values.fat > MEAL_LIMITS.maxMacroGrams
  );
}
