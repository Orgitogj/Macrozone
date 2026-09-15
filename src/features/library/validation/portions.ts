import { LIBRARY_LIMITS } from '@/features/library/constants';
import type { Food, FoodPortion, FoodPortionInput, Serving } from '@/features/library/types';
import { parseLibraryAmount, type AmountResult } from '@/features/library/validation/amounts';
import {
  calculateLoggedPortionNutrition,
  exceedsDiaryEntryLimits,
  NutritionCalculationError,
} from '@/features/library/utils/nutritionMath';
import { formatAmount, formatServingAmount, isServingUnit } from '@/features/library/utils/servingFormat';
import { MACRO_KEYS } from '@/types/nutrition';
import { formatNumberForInput } from '@/utils/numberInput';

export type PortionDraft = {
  key: string;
  foodId: string | null;
  foodName: string;
  serving: Serving;
  nutrition: FoodPortionInput['nutrition'];
  amountText: string;
};

export const ENTRY_LIMIT_MESSAGE = 'This amount is more than a single diary entry allows (10,000 kcal or 1,000 g per macro).';

export function parsePortionAmount(text: string, serving: Serving): AmountResult {
  return parseLibraryAmount(text, {
    label: 'Amount',
    required: true,
    allowZero: false,
    max: LIBRARY_LIMITS.maxPortionAmount,
    formatMax: (max) => formatServingAmount(max, serving.unit),
  });
}

export function parseLoggedServings(text: string): AmountResult {
  return parseLibraryAmount(text, {
    label: 'Servings',
    required: true,
    allowZero: false,
    max: LIBRARY_LIMITS.maxLoggedServings,
    formatMax: formatAmount,
  });
}

export function validatePortionForEntry(portion: Pick<FoodPortionInput, 'serving' | 'nutrition' | 'amount'>): string | null {
  try {
    return exceedsDiaryEntryLimits(calculateLoggedPortionNutrition(portion)) ? ENTRY_LIMIT_MESSAGE : null;
  } catch (error) {
    if (error instanceof NutritionCalculationError) {
      return error.message;
    }
    throw error;
  }
}

export function validatePortionInput(portion: FoodPortionInput): boolean {
  return (
    portion.foodName.trim().length > 0 &&
    portion.foodName.length <= LIBRARY_LIMITS.nameMaxLength &&
    isServingUnit(portion.serving.unit) &&
    Number.isFinite(portion.serving.amount) &&
    portion.serving.amount > 0 &&
    portion.serving.amount <= LIBRARY_LIMITS.maxServingAmount &&
    Number.isFinite(portion.amount) &&
    portion.amount > 0 &&
    portion.amount <= LIBRARY_LIMITS.maxPortionAmount &&
    MACRO_KEYS.every((key) => {
      const value = portion.nutrition[key];
      const max = key === 'calories' ? LIBRARY_LIMITS.maxCaloriesPerServing : LIBRARY_LIMITS.maxMacroGramsPerServing;
      return Number.isFinite(value) && value >= 0 && value <= max;
    })
  );
}

export function createPortionDraft(key: string, food: Pick<Food, 'id' | 'name' | 'serving' | 'nutrition'>, amount?: number): PortionDraft {
  return {
    key,
    foodId: food.id,
    foodName: food.name,
    serving: food.serving,
    nutrition: food.nutrition,
    amountText: formatNumberForInput(amount ?? food.serving.amount),
  };
}

export function portionToDraft(portion: FoodPortion): PortionDraft {
  return {
    key: portion.id,
    foodId: portion.foodId,
    foodName: portion.foodName,
    serving: portion.serving,
    nutrition: portion.nutrition,
    amountText: formatNumberForInput(portion.amount),
  };
}

export type PortionDraftsResult =
  | { ok: true; portions: FoodPortionInput[] }
  | { ok: false; errors: Record<string, string> };

export function validatePortionDrafts(drafts: readonly PortionDraft[], { checkEntryLimits }: { checkEntryLimits: boolean }): PortionDraftsResult {
  const errors: Record<string, string> = {};
  const portions: FoodPortionInput[] = [];
  for (const draft of drafts) {
    const amount = parsePortionAmount(draft.amountText, draft.serving);
    if (!amount.ok) {
      errors[draft.key] = amount.error;
      continue;
    }
    const portion: FoodPortionInput = {
      foodId: draft.foodId,
      foodName: draft.foodName,
      serving: draft.serving,
      nutrition: draft.nutrition,
      amount: amount.value,
    };
    if (!validatePortionInput(portion)) {
      errors[draft.key] = 'This item has invalid saved details.';
      continue;
    }
    const limitError = checkEntryLimits ? validatePortionForEntry(portion) : null;
    if (limitError) {
      errors[draft.key] = limitError;
      continue;
    }
    portions.push(portion);
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, portions };
}
