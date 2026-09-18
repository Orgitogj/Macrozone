import type { GuestDataCounts } from '@/features/account/services/guestImportService';
import type { SyncEntityType } from '@/features/sync/types';

export const IMPORT_STAGE_LABELS: Readonly<Record<SyncEntityType, string>> = {
  food: 'foods',
  saved_meal: 'saved meals',
  recipe: 'recipes',
  meal: 'logged meals',
  nutrition_plan: 'nutrition goals',
};

export type GuestCountRow = { key: keyof GuestDataCounts; label: string; count: number };

const LABELS: Readonly<Record<keyof GuestDataCounts, string>> = {
  meals: 'Logged meals',
  foods: 'Foods',
  savedMeals: 'Saved meals',
  recipes: 'Recipes',
  nutritionPlan: 'Nutrition goals',
};

export function totalGuestItems(counts: GuestDataCounts): number {
  return counts.meals + counts.foods + counts.savedMeals + counts.recipes + counts.nutritionPlan;
}

export function guestCountRows(counts: GuestDataCounts): GuestCountRow[] {
  return (Object.keys(LABELS) as (keyof GuestDataCounts)[]).map((key) => ({ key, label: LABELS[key], count: counts[key] }));
}

export function guestCountLabel(key: keyof GuestDataCounts): string {
  return LABELS[key];
}
