import { LIBRARY_LIMITS } from '@/features/library/constants';
import type { Recipe, RecipeInput, SavedMeal, SavedMealInput } from '@/features/library/types';
import { parseLibraryAmount } from '@/features/library/validation/amounts';
import { validateLibraryName } from '@/features/library/validation/foodForm';
import {
  portionToDraft,
  validatePortionDrafts,
  type PortionDraft,
} from '@/features/library/validation/portions';
import { calculateRecipeNutrition, NutritionCalculationError } from '@/features/library/utils/nutritionMath';
import { formatAmount } from '@/features/library/utils/servingFormat';
import { formatNumberForInput } from '@/utils/numberInput';

export type SavedMealFormValues = {
  name: string;
  items: PortionDraft[];
};

export type RecipeFormValues = {
  name: string;
  servings: string;
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

export function recipeToFormValues(recipe: Recipe): RecipeFormValues {
  return {
    name: recipe.name,
    servings: formatNumberForInput(recipe.servings),
    items: recipe.ingredients.map(portionToDraft),
  };
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

export function validateRecipeForm(
  values: RecipeFormValues,
): { ok: true; input: RecipeInput } | { ok: false; errors: CollectionFormErrors } {
  const errors: CollectionFormErrors = { itemErrors: {} };
  const name = validateLibraryName(values.name, 'Enter a recipe name.');
  if (!name.ok) {
    errors.name = name.error;
  }
  const servings = parseLibraryAmount(values.servings, {
    label: 'Servings',
    required: true,
    allowZero: false,
    max: LIBRARY_LIMITS.maxRecipeServings,
    formatMax: formatAmount,
  });
  if (!servings.ok) {
    errors.servings = servings.error;
  }
  if (values.items.length === 0) {
    errors.items = 'Add at least one ingredient.';
  } else if (values.items.length > LIBRARY_LIMITS.maxRecipeIngredients) {
    errors.items = `A recipe can have up to ${LIBRARY_LIMITS.maxRecipeIngredients} ingredients.`;
  }
  const portions = validatePortionDrafts(values.items, { checkEntryLimits: false });
  if (!portions.ok) {
    errors.itemErrors = portions.errors;
  }
  if (!name.ok || !servings.ok || !portions.ok || hasCollectionErrors(errors)) {
    return { ok: false, errors };
  }
  try {
    calculateRecipeNutrition({ servings: servings.value, ingredients: portions.portions });
  } catch (error) {
    if (error instanceof NutritionCalculationError) {
      return { ok: false, errors: { ...errors, items: error.message } };
    }
    throw error;
  }
  return { ok: true, input: { name: name.value, servings: servings.value, ingredients: portions.portions } };
}
