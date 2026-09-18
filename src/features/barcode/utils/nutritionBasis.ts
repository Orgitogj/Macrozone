import { NUTRITION_CHECKS } from '@/features/barcode/constants';
import type {
  BasisNutrition,
  BasisOption,
  MappedProductNutrition,
  NutrientReading,
  NutrientReadings,
  OnlineProduct,
  OnlineProductWarning,
} from '@/features/barcode/types';
import { LIBRARY_LIMITS } from '@/features/library/constants';
import { roundNutritionValue } from '@/features/library/utils/nutritionMath';
import { MACRO_KEYS, type MacroKey } from '@/types/nutrition';

export function kilojoulesToKilocalories(kilojoules: number): number {
  if (!Number.isFinite(kilojoules) || kilojoules < 0) {
    throw new RangeError('Energy must be finite and not negative.');
  }
  return roundNutritionValue(kilojoules / NUTRITION_CHECKS.kilojoulesPerKilocalorie);
}

function readValue(reading: NutrientReading): number | null {
  return reading.status === 'value' ? reading.value : null;
}

function toBasisNutrition(readings: NutrientReadings): BasisNutrition {
  return {
    calories: readValue(readings.calories),
    protein: readValue(readings.protein),
    carbs: readValue(readings.carbs),
    fat: readValue(readings.fat),
  };
}

function missingKeys(nutrition: BasisNutrition): MacroKey[] {
  return MACRO_KEYS.filter((key) => nutrition[key] === null);
}

function approximateKeys(readings: NutrientReadings): MacroKey[] {
  return MACRO_KEYS.filter((key) => {
    const reading = readings[key];
    return reading.status === 'value' && reading.approximate;
  });
}

function hasEstimated(readings: NutrientReadings): boolean {
  return MACRO_KEYS.some((key) => readings[key].status === 'estimated');
}

function isConverted(readings: NutrientReadings): boolean {
  const calories = readings.calories;
  return calories.status === 'value' && calories.convertedFromKilojoules;
}

function withinTolerance(actual: number, expected: number, absolute: number): boolean {
  return Math.abs(actual - expected) <= Math.max(absolute, NUTRITION_CHECKS.servingRelativeTolerance * Math.max(actual, expected));
}

export function isPer100Impossible(nutrition: BasisNutrition): boolean {
  const macros = (nutrition.protein ?? 0) + (nutrition.carbs ?? 0) + (nutrition.fat ?? 0);
  return macros > NUTRITION_CHECKS.maxMacroGramsPer100 || (nutrition.calories ?? 0) > NUTRITION_CHECKS.maxKilocaloriesPer100;
}

export function exceedsServingLimits(nutrition: BasisNutrition): boolean {
  return (
    (nutrition.calories ?? 0) > LIBRARY_LIMITS.maxCaloriesPerServing ||
    (['protein', 'carbs', 'fat'] as const).some((key) => (nutrition[key] ?? 0) > LIBRARY_LIMITS.maxMacroGramsPerServing)
  );
}

export function hasEnergyMismatch(nutrition: BasisNutrition): boolean {
  if (MACRO_KEYS.some((key) => nutrition[key] === null)) {
    return false;
  }
  const calories = nutrition.calories ?? 0;
  const fromMacros = (nutrition.protein ?? 0) * 4 + (nutrition.carbs ?? 0) * 4 + (nutrition.fat ?? 0) * 9;
  return Math.abs(calories - fromMacros) > Math.max(NUTRITION_CHECKS.energyMismatchAbsoluteKcal, NUTRITION_CHECKS.energyMismatchRelative * Math.max(calories, fromMacros));
}

export function isServingConsistent(per100: BasisNutrition, serving: BasisNutrition, quantity: number): boolean {
  return MACRO_KEYS.every((key) => {
    const base = per100[key];
    const actual = serving[key];
    if (base === null || actual === null) {
      return true;
    }
    const expected = (base * quantity) / 100;
    return withinTolerance(actual, expected, key === 'calories' ? NUTRITION_CHECKS.servingKcalToleranceAbsolute : NUTRITION_CHECKS.servingMacroToleranceGrams);
  });
}

const EMPTY_NUTRITION: BasisNutrition = { calories: null, protein: null, carbs: null, fat: null };

export function mapProductNutrition(product: OnlineProduct): MappedProductNutrition {
  const warnings = new Set<OnlineProductWarning>();
  const bases: BasisOption[] = [];
  if (product.preparedOnly) {
    warnings.add('prepared_only');
  }

  let per100Nutrition: BasisNutrition | null = null;
  if (product.per100) {
    const readings = product.per100.readings;
    let nutrition = toBasisNutrition(readings);
    if (hasEstimated(readings)) {
      warnings.add('estimated_values');
    }
    if (isPer100Impossible(nutrition)) {
      warnings.add('impossible_values');
      nutrition = EMPTY_NUTRITION;
    } else if (hasEnergyMismatch(nutrition)) {
      warnings.add('energy_mismatch');
    }
    if (missingKeys(nutrition).length < MACRO_KEYS.length) {
      per100Nutrition = nutrition;
      bases.push({
        id: product.per100.unit === 'g' ? 'per100g' : 'per100ml',
        servingAmount: 100,
        servingUnit: product.per100.unit,
        servingQuantity: null,
        servingQuantityUnit: null,
        nutrition,
        missing: missingKeys(nutrition),
        approximate: approximateKeys(readings),
        convertedFromKilojoules: isConverted(readings),
      });
    }
  }

  if (product.serving) {
    const readings = product.serving.readings;
    const nutrition = toBasisNutrition(readings);
    if (hasEstimated(readings)) {
      warnings.add('estimated_values');
    }
    const comparable = per100Nutrition !== null && product.per100 !== null && product.per100.unit === product.serving.unit;
    const consistent = !comparable || per100Nutrition === null || isServingConsistent(per100Nutrition, nutrition, product.serving.quantity);
    if (!consistent) {
      warnings.add('serving_inconsistent');
    } else if (exceedsServingLimits(nutrition)) {
      warnings.add('impossible_values');
    } else if (missingKeys(nutrition).length < MACRO_KEYS.length) {
      if (hasEnergyMismatch(nutrition)) {
        warnings.add('energy_mismatch');
      }
      bases.push({
        id: 'serving',
        servingAmount: 1,
        servingUnit: 'serving',
        servingQuantity: product.serving.quantity,
        servingQuantityUnit: product.serving.unit,
        nutrition,
        missing: missingKeys(nutrition),
        approximate: approximateKeys(readings),
        convertedFromKilojoules: isConverted(readings),
      });
    }
  }

  for (const basis of bases) {
    if (basis.approximate.length > 0) {
      warnings.add('approximate_values');
    }
    if (basis.convertedFromKilojoules) {
      warnings.add('energy_from_kilojoules');
    }
  }
  if (bases.length === 0) {
    warnings.add('no_nutrition');
  }
  if (product.name === null) {
    warnings.add('name_missing');
  }
  return { bases, warnings: [...warnings] };
}

export function describeProductWarning(warning: OnlineProductWarning): string {
  switch (warning) {
    case 'estimated_values':
      return 'Some values on Open Food Facts are estimates, not label data. They are left blank for you to fill in from the package.';
    case 'approximate_values':
      return 'Some values are approximate (for example “less than 0.5 g”).';
    case 'prepared_only':
      return 'Open Food Facts only lists values for the prepared product, which may differ from the product as sold.';
    case 'serving_inconsistent':
      return 'The per-serving values on Open Food Facts do not match its per 100 g or 100 ml values, so they are not offered.';
    case 'impossible_values':
      return 'Some nutrition values on Open Food Facts are impossible, so they were not used. Enter them from the package.';
    case 'energy_mismatch':
      return 'Calories do not match protein, carbs, and fat. Check the values against the package.';
    case 'energy_from_kilojoules':
      return 'Calories were converted from kilojoules because no kcal value was listed.';
    case 'no_nutrition':
      return 'Open Food Facts has no usable nutrition for this product. Enter the values from the package.';
    case 'name_missing':
      return 'This product has no name on Open Food Facts. Enter one before saving.';
    case 'name_shortened':
      return 'The product name was shortened to 80 characters.';
  }
}

export function describeBasis(basis: Pick<BasisOption, 'id' | 'servingQuantity' | 'servingQuantityUnit'>): string {
  switch (basis.id) {
    case 'per100g':
      return 'Per 100 g';
    case 'per100ml':
      return 'Per 100 ml';
    case 'serving':
      return basis.servingQuantity !== null && basis.servingQuantityUnit !== null
        ? `Per serving (${basis.servingQuantity} ${basis.servingQuantityUnit})`
        : 'Per serving';
  }
}
