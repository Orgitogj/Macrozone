import type { BasisId, BasisOption, ManualBasisUnit, OnlineProduct, OnlineProductWarning } from '@/features/barcode/types';
import { mapProductNutrition } from '@/features/barcode/utils/nutritionBasis';
import { LIBRARY_LIMITS } from '@/features/library/constants';
import type { Food, Serving } from '@/features/library/types';
import { calculateLoggedPortionNutrition, exceedsDiaryEntryLimits, roundNutrition, roundNutritionValue } from '@/features/library/utils/nutritionMath';
import { formatAmount } from '@/features/library/utils/servingFormat';
import { parseLibraryAmount } from '@/features/library/validation/amounts';
import { validateLibraryName } from '@/features/library/validation/foodForm';
import { ENTRY_LIMIT_MESSAGE } from '@/features/library/validation/portions';
import { MACRO_KEYS, type MacroKey, type MacroTotals } from '@/types/nutrition';
import { formatCalories, formatGrams } from '@/utils/format';
import { formatNumberForInput } from '@/utils/numberInput';

export type ProductReviewDraft = {
  product: OnlineProduct;
  fetchedAt: string;
  stale: boolean;
  bases: BasisOption[];
  warnings: OnlineProductWarning[];
  basisId: BasisId;
  manualUnit: ManualBasisUnit;
  name: string;
  amountText: string;
  nutritionText: Record<MacroKey, string>;
};

export type ReviewedProduct = {
  name: string;
  serving: Serving & { unit: ManualBasisUnit };
  baseNutrition: MacroTotals;
  amount: number;
  consumed: MacroTotals;
  userReviewed: boolean;
};

export type ProductReviewErrors = {
  name?: string;
  amount?: string;
  nutrition: Partial<Record<MacroKey, string>>;
  form?: string;
};

export type ProductReviewValidation = { ok: true; value: ReviewedProduct } | { ok: false; errors: ProductReviewErrors };

const NUTRIENT_LABELS: Readonly<Record<MacroKey, string>> = { calories: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat' };

const EMPTY_NUTRITION_TEXT: Record<MacroKey, string> = { calories: '', protein: '', carbs: '', fat: '' };

export const MISSING_VALUE_MESSAGE = 'Missing from Open Food Facts. Enter it from the package.';

function basisNutritionText(basis: BasisOption): Record<MacroKey, string> {
  const text = { ...EMPTY_NUTRITION_TEXT };
  for (const key of MACRO_KEYS) {
    const value = basis.nutrition[key];
    text[key] = value === null ? '' : formatNumberForInput(roundNutritionValue(value));
  }
  return text;
}

function defaultAmountText(unit: ManualBasisUnit): string {
  return unit === 'serving' ? '1' : '100';
}

export function initialProductName(product: OnlineProduct): string {
  return product.name === null ? '' : product.name.slice(0, LIBRARY_LIMITS.nameMaxLength).trimEnd();
}

export function createProductReviewDraft(product: OnlineProduct, { fetchedAt, stale }: { fetchedAt: string; stale: boolean }): ProductReviewDraft {
  const mapped = mapProductNutrition(product);
  const warnings = [...mapped.warnings];
  if (product.name !== null && product.name.length > LIBRARY_LIMITS.nameMaxLength) {
    warnings.push('name_shortened');
  }
  const first = mapped.bases[0];
  return {
    product,
    fetchedAt,
    stale,
    bases: mapped.bases,
    warnings,
    basisId: first ? first.id : 'manual',
    manualUnit: product.per100?.unit ?? 'g',
    name: initialProductName(product),
    amountText: first ? defaultAmountText(first.servingUnit) : defaultAmountText(product.per100?.unit ?? 'g'),
    nutritionText: first ? basisNutritionText(first) : { ...EMPTY_NUTRITION_TEXT },
  };
}

export function findBasis(draft: ProductReviewDraft): BasisOption | null {
  return draft.basisId === 'manual' ? null : (draft.bases.find((basis) => basis.id === draft.basisId) ?? null);
}

export function selectBasis(draft: ProductReviewDraft, basisId: BasisId): ProductReviewDraft {
  if (basisId === draft.basisId) {
    return draft;
  }
  if (basisId === 'manual') {
    return { ...draft, basisId, amountText: defaultAmountText(draft.manualUnit), nutritionText: { ...EMPTY_NUTRITION_TEXT } };
  }
  const basis = draft.bases.find((candidate) => candidate.id === basisId);
  if (!basis) {
    return draft;
  }
  return { ...draft, basisId, amountText: defaultAmountText(basis.servingUnit), nutritionText: basisNutritionText(basis) };
}

export function selectManualUnit(draft: ProductReviewDraft, unit: ManualBasisUnit): ProductReviewDraft {
  return draft.basisId !== 'manual' || draft.manualUnit === unit ? draft : { ...draft, manualUnit: unit, amountText: defaultAmountText(unit) };
}

export function changeProductName(draft: ProductReviewDraft, name: string): ProductReviewDraft {
  return { ...draft, name };
}

export function changeProductAmount(draft: ProductReviewDraft, amountText: string): ProductReviewDraft {
  return { ...draft, amountText };
}

export function changeProductNutrient(draft: ProductReviewDraft, key: MacroKey, text: string): ProductReviewDraft {
  return { ...draft, nutritionText: { ...draft.nutritionText, [key]: text } };
}

export function canUseFoodValues(food: Pick<Food, 'serving'>): boolean {
  return food.serving.unit === 'g' || food.serving.unit === 'ml' || food.serving.unit === 'serving';
}

export function applyFoodValues(draft: ProductReviewDraft, food: Food): ProductReviewDraft {
  if (!canUseFoodValues(food)) {
    return draft;
  }
  const scale = food.serving.unit === 'serving' ? 1 / food.serving.amount : 100 / food.serving.amount;
  const text = { ...EMPTY_NUTRITION_TEXT };
  for (const key of MACRO_KEYS) {
    text[key] = formatNumberForInput(roundNutritionValue(food.nutrition[key] * scale));
  }
  return {
    ...draft,
    basisId: 'manual',
    manualUnit: food.serving.unit as ManualBasisUnit,
    name: food.name,
    amountText: formatNumberForInput(food.serving.amount),
    nutritionText: text,
  };
}

export function currentServing(draft: ProductReviewDraft): Serving & { unit: ManualBasisUnit } {
  const basis = findBasis(draft);
  if (basis) {
    return { amount: basis.servingAmount, unit: basis.servingUnit };
  }
  return { amount: draft.manualUnit === 'serving' ? 1 : 100, unit: draft.manualUnit };
}

export function describeCurrentBasis(draft: ProductReviewDraft): string {
  const basis = findBasis(draft);
  if (basis === null) {
    return draft.manualUnit === 'serving' ? 'Values you entered per serving' : `Values you entered per 100 ${draft.manualUnit}`;
  }
  switch (basis.id) {
    case 'per100g':
      return 'Per 100 g, from Open Food Facts';
    case 'per100ml':
      return 'Per 100 ml, from Open Food Facts';
    case 'serving':
      return basis.servingQuantity !== null && basis.servingQuantityUnit !== null
        ? `Per serving (1 serving = ${formatAmount(basis.servingQuantity)} ${basis.servingQuantityUnit}), from Open Food Facts`
        : 'Per serving, from Open Food Facts';
  }
}

export function isProductReviewEdited(draft: ProductReviewDraft): boolean {
  const basis = findBasis(draft);
  if (basis === null || draft.name.trim() !== initialProductName(draft.product)) {
    return true;
  }
  const original = basisNutritionText(basis);
  return MACRO_KEYS.some((key) => draft.nutritionText[key].trim() !== original[key]);
}

export function validateProductReview(draft: ProductReviewDraft): ProductReviewValidation {
  const errors: ProductReviewErrors = { nutrition: {} };
  const basis = findBasis(draft);
  const serving = currentServing(draft);

  const name = validateLibraryName(draft.name, 'Enter a name for this product.');
  if (!name.ok) {
    errors.name = name.error;
  }

  const amount = parseLibraryAmount(draft.amountText, {
    label: 'Amount',
    required: true,
    allowZero: false,
    max: serving.unit === 'serving' ? LIBRARY_LIMITS.maxLoggedServings : LIBRARY_LIMITS.maxPortionAmount,
    formatMax: formatAmount,
  });
  if (!amount.ok) {
    errors.amount = amount.error;
  }

  const nutrition: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const key of MACRO_KEYS) {
    const text = draft.nutritionText[key];
    if (text.trim() === '') {
      errors.nutrition[key] = basis !== null && basis.missing.includes(key) ? MISSING_VALUE_MESSAGE : `${NUTRIENT_LABELS[key]} is required.`;
      continue;
    }
    const parsed = parseLibraryAmount(text, {
      label: NUTRIENT_LABELS[key],
      required: true,
      allowZero: true,
      max: key === 'calories' ? LIBRARY_LIMITS.maxCaloriesPerServing : LIBRARY_LIMITS.maxMacroGramsPerServing,
      formatMax: key === 'calories' ? (max) => `${formatCalories(max)} kcal` : formatGrams,
    });
    if (parsed.ok) {
      nutrition[key] = parsed.value;
    } else {
      errors.nutrition[key] = parsed.error;
    }
  }

  if (errors.name || errors.amount || Object.keys(errors.nutrition).length > 0 || !name.ok || !amount.ok) {
    return { ok: false, errors };
  }
  const consumed = calculateLoggedPortionNutrition({ serving, nutrition, amount: amount.value });
  if (exceedsDiaryEntryLimits(consumed)) {
    return { ok: false, errors: { ...errors, form: ENTRY_LIMIT_MESSAGE } };
  }
  return {
    ok: true,
    value: {
      name: name.value,
      serving,
      baseNutrition: roundNutrition(nutrition),
      amount: amount.value,
      consumed,
      userReviewed: isProductReviewEdited(draft),
    },
  };
}

export function previewConsumed(draft: ProductReviewDraft): MacroTotals | null {
  const result = validateProductReview({ ...draft, name: draft.name.trim() === '' ? 'Preview' : draft.name });
  return result.ok ? result.value.consumed : null;
}
