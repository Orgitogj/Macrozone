import { AI_LIMITS } from '@/features/ai-meal/constants';
import type { AiConfidence, AiEstimatedItem, AiInputKind, AiMealAnalysis, AiUncertainty } from '@/features/ai-meal/types';
import { LIBRARY_LIMITS } from '@/features/library/constants';
import type { Food, ServingUnit } from '@/features/library/types';
import {
  calculateLoggedPortionNutrition,
  roundNutrition,
  roundNutritionValue,
  sumNutrition,
} from '@/features/library/utils/nutritionMath';
import { isServingUnit } from '@/features/library/utils/servingFormat';
import { parseLibraryAmount } from '@/features/library/validation/amounts';
import { validateLibraryName } from '@/features/library/validation/foodForm';
import { parsePortionAmount } from '@/features/library/validation/portions';
import { MEAL_LIMITS } from '@/features/meals/constants';
import { MACRO_KEYS, type MacroKey, type MacroTotals } from '@/types/nutrition';
import { formatCalories, formatGrams } from '@/utils/format';
import { formatNumberForInput } from '@/utils/numberInput';

export type ReviewPortionReference = {
  amount: number;
  unit: ServingUnit;
  nutrition: MacroTotals;
};

export type ReviewFoodOption = Pick<Food, 'id' | 'name' | 'serving' | 'nutrition'>;

export type AiReviewItem = {
  key: string;
  name: string;
  amountText: string;
  unit: ServingUnit;
  nutritionText: Record<MacroKey, string>;
  reference: ReviewPortionReference | null;
  aiEstimate: ReviewPortionReference | null;
  matchedFood: ReviewFoodOption | null;
  suggestions: ReviewFoodOption[];
  confidence: AiConfidence | null;
  note: string | null;
  uncertainties: AiUncertainty[];
};

export type AiReviewDraft = {
  analysisId: string;
  inputKind: AiInputKind;
  title: string;
  quality: AiConfidence;
  warnings: string[];
  items: AiReviewItem[];
};

export type ReviewedItem = {
  name: string;
  amount: number;
  unit: ServingUnit;
  nutrition: MacroTotals;
  matchedFoodId: string | null;
};

export type ReviewValidation =
  | { ok: true; title: string; items: ReviewedItem[]; totals: MacroTotals }
  | { ok: false; titleError: string | null; listError: string | null; itemErrors: Record<string, string> };

function nutritionToText(nutrition: MacroTotals): Record<MacroKey, string> {
  return {
    calories: formatNumberForInput(roundNutritionValue(nutrition.calories)),
    protein: formatNumberForInput(roundNutritionValue(nutrition.protein)),
    carbs: formatNumberForInput(roundNutritionValue(nutrition.carbs)),
    fat: formatNumberForInput(roundNutritionValue(nutrition.fat)),
  };
}

function parseNutritionValue(key: MacroKey, text: string) {
  return parseLibraryAmount(text, {
    label: key === 'calories' ? 'Calories' : key[0].toUpperCase() + key.slice(1),
    required: true,
    allowZero: true,
    max: key === 'calories' ? MEAL_LIMITS.maxCalories : MEAL_LIMITS.maxMacroGrams,
    formatMax: key === 'calories' ? (max) => `${formatCalories(max)} kcal` : formatGrams,
  });
}

export function parseItemNutrition(item: AiReviewItem): { ok: true; nutrition: MacroTotals } | { ok: false; error: string } {
  const nutrition: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const key of MACRO_KEYS) {
    const parsed = parseNutritionValue(key, item.nutritionText[key]);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }
    nutrition[key] = parsed.value;
  }
  return { ok: true, nutrition };
}

export function createReviewItem(key: string, estimate: AiEstimatedItem): AiReviewItem {
  const reference = { amount: estimate.amount, unit: estimate.unit, nutrition: roundNutrition(estimate.nutrition) };
  return {
    key,
    name: estimate.name,
    amountText: formatNumberForInput(estimate.amount),
    unit: estimate.unit,
    nutritionText: nutritionToText(estimate.nutrition),
    reference,
    aiEstimate: reference,
    matchedFood: null,
    suggestions: [],
    confidence: estimate.confidence,
    note: estimate.note,
    uncertainties: estimate.uncertainties,
  };
}

export function createBlankReviewItem(key: string): AiReviewItem {
  return {
    key,
    name: '',
    amountText: '',
    unit: 'g',
    nutritionText: { calories: '', protein: '', carbs: '', fat: '' },
    reference: null,
    aiEstimate: null,
    matchedFood: null,
    suggestions: [],
    confidence: null,
    note: null,
    uncertainties: [],
  };
}

export function createReviewDraft(analysis: AiMealAnalysis): AiReviewDraft {
  return {
    analysisId: analysis.analysisId,
    inputKind: analysis.inputKind,
    title: analysis.title,
    quality: analysis.quality,
    warnings: analysis.warnings,
    items: analysis.items.map((item, index) => createReviewItem(`ai-${index}`, item)),
  };
}

function scaleFromReference(reference: ReviewPortionReference, amount: number): MacroTotals {
  return calculateLoggedPortionNutrition({
    serving: { amount: reference.amount, unit: reference.unit },
    nutrition: reference.nutrition,
    amount,
  });
}

export function changeItemName(item: AiReviewItem, name: string): AiReviewItem {
  return { ...item, name };
}

export function changeItemAmount(item: AiReviewItem, amountText: string): AiReviewItem {
  const amount = parsePortionAmount(amountText, { amount: 1, unit: item.unit });
  if (!amount.ok || item.reference === null || item.reference.unit !== item.unit) {
    return { ...item, amountText };
  }
  return { ...item, amountText, nutritionText: nutritionToText(scaleFromReference(item.reference, amount.value)) };
}

function currentReference(item: AiReviewItem, unit: ServingUnit): ReviewPortionReference | null {
  const amount = parsePortionAmount(item.amountText, { amount: 1, unit });
  const nutrition = parseItemNutrition(item);
  return amount.ok && nutrition.ok ? { amount: amount.value, unit, nutrition: nutrition.nutrition } : null;
}

export function changeItemNutrition(item: AiReviewItem, key: MacroKey, text: string): AiReviewItem {
  const next = { ...item, nutritionText: { ...item.nutritionText, [key]: text }, matchedFood: null };
  return { ...next, reference: currentReference(next, next.unit) };
}

export function changeItemUnit(item: AiReviewItem, unit: ServingUnit): AiReviewItem {
  if (!isServingUnit(unit) || unit === item.unit) {
    return item;
  }
  return { ...item, unit, matchedFood: null, reference: currentReference(item, unit) };
}

export function linkItemToFood(item: AiReviewItem, food: ReviewFoodOption): AiReviewItem {
  const currentAmount = parsePortionAmount(item.amountText, { amount: 1, unit: item.unit });
  const amount = currentAmount.ok && item.unit === food.serving.unit ? currentAmount.value : food.serving.amount;
  const reference = { amount: food.serving.amount, unit: food.serving.unit, nutrition: food.nutrition };
  return {
    ...item,
    unit: food.serving.unit,
    amountText: formatNumberForInput(amount),
    nutritionText: nutritionToText(scaleFromReference(reference, amount)),
    reference,
    matchedFood: food,
  };
}

export function unlinkItem(item: AiReviewItem): AiReviewItem {
  if (item.aiEstimate === null) {
    return { ...item, matchedFood: null, reference: currentReference(item, item.unit) };
  }
  return {
    ...item,
    matchedFood: null,
    unit: item.aiEstimate.unit,
    amountText: formatNumberForInput(item.aiEstimate.amount),
    nutritionText: nutritionToText(item.aiEstimate.nutrition),
    reference: item.aiEstimate,
  };
}

export function validateReviewItem(item: AiReviewItem): { ok: true; item: ReviewedItem } | { ok: false; error: string } {
  const name = validateLibraryName(item.name, 'Enter a name for this item.');
  if (!name.ok) {
    return { ok: false, error: name.error };
  }
  if (!isServingUnit(item.unit)) {
    return { ok: false, error: 'Choose a unit.' };
  }
  const amount = parsePortionAmount(item.amountText, { amount: 1, unit: item.unit });
  if (!amount.ok) {
    return { ok: false, error: amount.error };
  }
  const nutrition = parseItemNutrition(item);
  if (!nutrition.ok) {
    return { ok: false, error: nutrition.error };
  }
  return {
    ok: true,
    item: {
      name: name.value,
      amount: amount.value,
      unit: item.unit,
      nutrition: roundNutrition(nutrition.nutrition),
      matchedFoodId: item.matchedFood?.id ?? null,
    },
  };
}

export function calculateReviewTotals(items: readonly ReviewedItem[]): MacroTotals {
  return roundNutrition(sumNutrition(items.map((item) => roundNutrition(item.nutrition))));
}

export function summarizeValidReviewItems(draft: AiReviewDraft): { totals: MacroTotals; validCount: number } {
  const valid = draft.items.flatMap((item) => {
    const result = validateReviewItem(item);
    return result.ok ? [result.item] : [];
  });
  return { totals: calculateReviewTotals(valid), validCount: valid.length };
}

export function validateReviewDraft(draft: AiReviewDraft): ReviewValidation {
  const title = validateLibraryName(draft.title, 'Enter a title for this meal.');
  const itemErrors: Record<string, string> = {};
  const items: ReviewedItem[] = [];
  for (const item of draft.items) {
    const result = validateReviewItem(item);
    if (result.ok) {
      items.push(result.item);
    } else {
      itemErrors[item.key] = result.error;
    }
  }
  const listError =
    draft.items.length === 0
      ? 'Add at least one item.'
      : draft.items.length > AI_LIMITS.maxItems
        ? `Use ${AI_LIMITS.maxItems} items or fewer.`
        : null;
  if (!title.ok || listError !== null || Object.keys(itemErrors).length > 0) {
    return { ok: false, titleError: title.ok ? null : title.error, listError, itemErrors };
  }
  return { ok: true, title: title.value.slice(0, LIBRARY_LIMITS.nameMaxLength), items, totals: calculateReviewTotals(items) };
}
