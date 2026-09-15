import type { Food, Recipe, SavedMeal } from '@/features/library/types';
import { calculateRecipeNutrition, calculateSavedMealNutrition } from '@/features/library/utils/nutritionMath';
import { formatAmount, formatServing } from '@/features/library/utils/servingFormat';
import type { MacroTotals } from '@/types/nutrition';
import { formatCalories, formatGrams } from '@/utils/format';

export type RowText = {
  title: string;
  subtitle: string;
  detail: string;
  accessibilityLabel: string;
};

function macroLine(nutrition: MacroTotals): string {
  return `P ${formatGrams(nutrition.protein)} · C ${formatGrams(nutrition.carbs)} · F ${formatGrams(nutrition.fat)}`;
}

function spokenMacros(nutrition: MacroTotals): string {
  return `${formatCalories(nutrition.calories)} calories, ${formatGrams(nutrition.protein)} protein, ${formatGrams(nutrition.carbs)} carbs, ${formatGrams(nutrition.fat)} fat`;
}

export function describeFoodRow(food: Food): RowText {
  const serving = formatServing(food.serving);
  return {
    title: food.name,
    subtitle: `${serving} · ${macroLine(food.nutrition)}`,
    detail: `${formatCalories(food.nutrition.calories)} kcal`,
    accessibilityLabel: `${food.name}${food.isFavorite ? ', favorite' : ''}, per ${serving}: ${spokenMacros(food.nutrition)}`,
  };
}

export function describeSavedMealRow(savedMeal: SavedMeal): RowText {
  const nutrition = calculateSavedMealNutrition(savedMeal.items);
  const count = savedMeal.items.length === 1 ? '1 food' : `${savedMeal.items.length} foods`;
  return {
    title: savedMeal.name,
    subtitle: `${count} · ${macroLine(nutrition)}`,
    detail: `${formatCalories(nutrition.calories)} kcal`,
    accessibilityLabel: `${savedMeal.name}, ${count}, total ${spokenMacros(nutrition)}`,
  };
}

export function describeRecipeRow(recipe: Recipe): RowText {
  const { perServing } = calculateRecipeNutrition(recipe);
  const servings = `${formatAmount(recipe.servings)} ${recipe.servings === 1 ? 'serving' : 'servings'}`;
  return {
    title: recipe.name,
    subtitle: `${servings} · per serving ${macroLine(perServing)}`,
    detail: `${formatCalories(perServing.calories)} kcal`,
    accessibilityLabel: `${recipe.name}, makes ${servings}, per serving ${spokenMacros(perServing)}`,
  };
}
