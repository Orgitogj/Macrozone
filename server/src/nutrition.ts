import type { NutritionValues } from './contract.ts';

function shiftDecimal(value: number, exponent: number): number {
  const [mantissa, power = '0'] = String(value).split('e');
  return Number(`${mantissa}e${Number(power) + exponent}`);
}

export function roundNutritionValue(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError('Nutrition values must be finite and not negative.');
  }
  const rounded = shiftDecimal(Math.round(shiftDecimal(value, 2)), -2);
  return rounded === 0 ? 0 : rounded;
}

export function roundNutrition(values: NutritionValues): NutritionValues {
  return {
    calories: roundNutritionValue(values.calories),
    protein: roundNutritionValue(values.protein),
    carbs: roundNutritionValue(values.carbs),
    fat: roundNutritionValue(values.fat),
  };
}

export function computeTotals(items: readonly NutritionValues[]): NutritionValues {
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const item of items) {
    const rounded = roundNutrition(item);
    totals.calories += rounded.calories;
    totals.protein += rounded.protein;
    totals.carbs += rounded.carbs;
    totals.fat += rounded.fat;
  }
  return roundNutrition(totals);
}
