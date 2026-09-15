import { LIBRARY_LIMITS } from '@/features/library/constants';
import type { SavedMeal, SavedMealInput } from '@/features/library/types';
import { validateLibraryName } from '@/features/library/validation/foodForm';
import {
  portionToDraft,
  validatePortionDrafts,
  type PortionDraft,
} from '@/features/library/validation/portions';

export type SavedMealFormValues = {
  name: string;
  items: PortionDraft[];
};

export type CollectionFormErrors = {
  name?: string;
  servings?: string;
  items?: string;
  itemErrors: Record<string, string>;
};

export function savedMealToFormValues(savedMeal: SavedMeal): SavedMealFormValues {
  return { name: savedMeal.name, items: savedMeal.items.map(portionToDraft) };
}

export function hasCollectionErrors(errors: CollectionFormErrors): boolean {
  return (
    errors.name !== undefined ||
    errors.servings !== undefined ||
    errors.items !== undefined ||
    Object.keys(errors.itemErrors).length > 0
  );
}

export function validateSavedMealForm(
  values: SavedMealFormValues,
): { ok: true; input: SavedMealInput } | { ok: false; errors: CollectionFormErrors } {
  const errors: CollectionFormErrors = { itemErrors: {} };
  const name = validateLibraryName(values.name, 'Enter a name for this saved meal.');
  if (!name.ok) {
    errors.name = name.error;
  }
  if (values.items.length === 0) {
    errors.items = 'Add at least one food.';
  } else if (values.items.length > LIBRARY_LIMITS.maxSavedMealItems) {
    errors.items = `A saved meal can have up to ${LIBRARY_LIMITS.maxSavedMealItems} foods.`;
  }
  const portions = validatePortionDrafts(values.items, { checkEntryLimits: true });
  if (!portions.ok) {
    errors.itemErrors = portions.errors;
  }
  if (!name.ok || !portions.ok || hasCollectionErrors(errors)) {
    return { ok: false, errors };
  }
  return { ok: true, input: { name: name.value, items: portions.portions } };
}
