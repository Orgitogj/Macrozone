import { LIBRARY_LIMITS } from '@/features/library/constants';
import type { Food, FoodInput, ServingUnit } from '@/features/library/types';
import { parseLibraryAmount } from '@/features/library/validation/amounts';
import { normalizeLibraryName } from '@/features/library/utils/librarySearch';
import { formatAmount, isServingUnit } from '@/features/library/utils/servingFormat';
import { formatCalories, formatGrams } from '@/utils/format';
import { formatNumberForInput } from '@/utils/numberInput';

export type FoodFormValues = {
  name: string;
  servingAmount: string;
  servingUnit: ServingUnit;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
};

export type FoodFormField = keyof FoodFormValues;

export type FoodFormErrors = Partial<Record<FoodFormField, string>>;

export type FoodFormValidationResult = { ok: true; input: FoodInput } | { ok: false; errors: FoodFormErrors };

export function createEmptyFoodFormValues(): FoodFormValues {
  return { name: '', servingAmount: '100', servingUnit: 'g', calories: '', protein: '', carbs: '', fat: '' };
}

export function foodToFormValues(food: Food): FoodFormValues {
  return {
    name: food.name,
    servingAmount: formatNumberForInput(food.serving.amount),
    servingUnit: food.serving.unit,
    calories: formatNumberForInput(food.nutrition.calories),
    protein: formatNumberForInput(food.nutrition.protein),
    carbs: formatNumberForInput(food.nutrition.carbs),
    fat: formatNumberForInput(food.nutrition.fat),
  };
}

export function validateLibraryName(name: string, emptyMessage: string): { ok: true; value: string } | { ok: false; error: string } {
  const normalized = normalizeLibraryName(name);
  if (normalized === '') {
    return { ok: false, error: emptyMessage };
  }
  if (normalized.length > LIBRARY_LIMITS.nameMaxLength) {
    return { ok: false, error: `Use ${LIBRARY_LIMITS.nameMaxLength} characters or fewer.` };
  }
  return { ok: true, value: normalized };
}

export function validateFoodForm(values: FoodFormValues): FoodFormValidationResult {
  const errors: FoodFormErrors = {};

  const name = validateLibraryName(values.name, 'Enter a food name.');
  if (!name.ok) {
    errors.name = name.error;
  }

  const servingAmount = parseLibraryAmount(values.servingAmount, {
    label: 'Serving size',
    required: true,
    allowZero: false,
    max: LIBRARY_LIMITS.maxServingAmount,
    formatMax: formatAmount,
  });
  if (!servingAmount.ok) {
    errors.servingAmount = servingAmount.error;
  }

  if (!isServingUnit(values.servingUnit)) {
    errors.servingUnit = 'Choose a serving unit.';
  }

  const calories = parseLibraryAmount(values.calories, {
    label: 'Calories',
    required: true,
    allowZero: true,
    max: LIBRARY_LIMITS.maxCaloriesPerServing,
    formatMax: (max) => `${formatCalories(max)} kcal`,
  });
  if (!calories.ok) {
    errors.calories = calories.error;
  }

  const macroRule = (label: string) => ({
    label,
    required: false,
    allowZero: true,
    max: LIBRARY_LIMITS.maxMacroGramsPerServing,
    formatMax: formatGrams,
  });
  const protein = parseLibraryAmount(values.protein, macroRule('Protein'));
  const carbs = parseLibraryAmount(values.carbs, macroRule('Carbs'));
  const fat = parseLibraryAmount(values.fat, macroRule('Fat'));
  if (!protein.ok) {
    errors.protein = protein.error;
  }
  if (!carbs.ok) {
    errors.carbs = carbs.error;
  }
  if (!fat.ok) {
    errors.fat = fat.error;
  }

  if (!name.ok || !servingAmount.ok || !calories.ok || !protein.ok || !carbs.ok || !fat.ok || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: {
      name: name.value,
      serving: { amount: servingAmount.value, unit: values.servingUnit },
      nutrition: { calories: calories.value, protein: protein.value, carbs: carbs.value, fat: fat.value },
    },
  };
}
