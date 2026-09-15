import type { ServingUnit } from '@/features/library/types';

export const SERVING_UNITS = ['g', 'ml', 'serving', 'piece', 'cup', 'tbsp', 'tsp'] as const;

export const SERVING_UNIT_LABELS: Readonly<Record<ServingUnit, { short: string; singular: string; plural: string }>> = {
  g: { short: 'g', singular: 'gram', plural: 'grams' },
  ml: { short: 'ml', singular: 'milliliter', plural: 'milliliters' },
  serving: { short: 'serving', singular: 'serving', plural: 'servings' },
  piece: { short: 'piece', singular: 'piece', plural: 'pieces' },
  cup: { short: 'cup', singular: 'cup', plural: 'cups' },
  tbsp: { short: 'tbsp', singular: 'tablespoon', plural: 'tablespoons' },
  tsp: { short: 'tsp', singular: 'teaspoon', plural: 'teaspoons' },
};

export const LIBRARY_LIMITS = {
  nameMaxLength: 80,
  maxDecimalPlaces: 2,
  maxServingAmount: 10000,
  maxPortionAmount: 100000,
  maxCaloriesPerServing: 10000,
  maxMacroGramsPerServing: 1000,
  maxRecipeServings: 1000,
  maxLoggedServings: 100,
  maxSavedMealItems: 50,
  maxRecipeIngredients: 100,
  listLimit: 200,
  recentLimit: 30,
} as const;

export const LIBRARY_MESSAGES = {
  readFailed: 'Could not read your food library on this device.',
  writeFailed: 'Could not save your food library changes on this device.',
  notFound: 'This item no longer exists.',
  duplicateFood: 'A food with the same name, serving and nutrition already exists.',
  idGenerationFailed: 'Could not create a unique ID. Please try again.',
  unsupportedVersion: 'This food library was saved by a newer version of MacroZone. Update the app to change it.',
  invalidData: 'Some details are invalid. Check the form and try again.',
} as const;
