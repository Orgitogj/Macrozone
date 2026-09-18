import {
  FOOD_BARCODE_LINKS_STORAGE_KEY,
  FOOD_BARCODE_LINKS_STORAGE_VERSION,
  parseFoodBarcodeLinks,
} from '@/features/barcode/repositories/asyncStorageBarcodeRepositories';
import {
  LIBRARY_STORAGE_KEY,
  LIBRARY_STORAGE_VERSION,
  parseLibraryState,
  type LibraryState,
} from '@/features/library/repositories/asyncStorageLibraryRepositories';
import { NUTRITION_PLAN_STORAGE_KEY } from '@/features/nutrition-goals/repositories/asyncStorageNutritionPlanRepository';
import {
  EMPTY_NUTRITION_PLAN,
  isOnboardingStatus,
  parseBodyProfile,
  parseSavedGoals,
} from '@/features/nutrition-goals/repositories/nutritionPlanRepository';
import type { NutritionPlan } from '@/features/nutrition-goals/types';
import { ASYNC_STORAGE_MEALS_KEY } from '@/features/meals/repositories/asyncStorageMealRepository';
import { MEAL_ENTRY_SOURCE_RECORD_KEY, parseStoredMealEntrySource } from '@/features/meals/utils/mealEntrySources';
import { isRecord, normalizeStoredMeal } from '@/features/meals/utils/mealRecords';
import type { BarcodeLink, SyncAggregate, SyncEntityType } from '@/features/sync/types';
import { NUTRITION_PLAN_ENTITY_ID } from '@/storage/database/syncSchema';

export const WEB_SYNC_STATE_KEY = 'sync_state';

export const WEB_SYNC_KEYS = [
  ASYNC_STORAGE_MEALS_KEY,
  LIBRARY_STORAGE_KEY,
  FOOD_BARCODE_LINKS_STORAGE_KEY,
  NUTRITION_PLAN_STORAGE_KEY,
  WEB_SYNC_STATE_KEY,
] as const;

export type WebLinkRecord = { barcode: string; foodId: string; linkedAt: string };

export type WebSnapshot = {
  mealRecords: unknown[];
  library: LibraryState;
  links: WebLinkRecord[];
  plan: NutritionPlan;
};

export function parseMealRecords(raw: string | null): unknown[] {
  if (raw === null) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseNutritionPlanValue(raw: string | null): NutritionPlan {
  if (raw === null) {
    return EMPTY_NUTRITION_PLAN;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return EMPTY_NUTRITION_PLAN;
    }
    const status = parsed.onboardingStatus;
    return {
      profile: parsed.profile === undefined ? null : parseBodyProfile(parsed.profile),
      goals: parsed.goals === undefined ? null : parseSavedGoals(parsed.goals),
      onboardingStatus: isOnboardingStatus(status) ? status : null,
    };
  } catch {
    return EMPTY_NUTRITION_PLAN;
  }
}

export function readMealAggregate(records: readonly unknown[], mealId: string): SyncAggregate | null {
  const record = records.find((candidate) => isRecord(candidate) && candidate.id === mealId);
  const meal = normalizeStoredMeal(record);
  if (meal === null) {
    return null;
  }
  const source = isRecord(record) ? parseStoredMealEntrySource(record[MEAL_ENTRY_SOURCE_RECORD_KEY]) : null;
  return { type: 'meal', id: mealId, meal, source };
}

export function readAggregateFromSnapshot(snapshot: WebSnapshot, entityType: SyncEntityType, entityId: string): SyncAggregate | null {
  switch (entityType) {
    case 'meal':
      return readMealAggregate(snapshot.mealRecords, entityId);
    case 'food': {
      const food = snapshot.library.foods.find((candidate) => candidate.id === entityId);
      if (food === undefined) {
        return null;
      }
      const barcodes = snapshot.links
        .filter((link) => link.foodId === entityId)
        .map((link): BarcodeLink => ({ barcode: link.barcode, linkedAt: link.linkedAt }))
        .sort((a, b) => (a.barcode < b.barcode ? -1 : 1));
      return { type: 'food', id: entityId, food, barcodes };
    }
    case 'saved_meal': {
      const savedMeal = snapshot.library.savedMeals.find((candidate) => candidate.id === entityId);
      return savedMeal === undefined ? null : { type: 'saved_meal', id: entityId, savedMeal };
    }
    case 'recipe': {
      const recipe = snapshot.library.recipes.find((candidate) => candidate.id === entityId);
      return recipe === undefined ? null : { type: 'recipe', id: entityId, recipe };
    }
    case 'nutrition_plan': {
      const isEmpty = snapshot.plan.profile === null && snapshot.plan.goals === null && snapshot.plan.onboardingStatus === null;
      return isEmpty ? null : { type: 'nutrition_plan', id: NUTRITION_PLAN_ENTITY_ID, plan: snapshot.plan };
    }
  }
}

export function listSnapshotEntities(snapshot: WebSnapshot): { entityType: SyncEntityType; entityId: string }[] {
  const entities: { entityType: SyncEntityType; entityId: string }[] = [];
  for (const record of snapshot.mealRecords) {
    const meal = normalizeStoredMeal(record);
    if (meal !== null) {
      entities.push({ entityType: 'meal', entityId: meal.id });
    }
  }
  for (const food of snapshot.library.foods) {
    entities.push({ entityType: 'food', entityId: food.id });
  }
  for (const savedMeal of snapshot.library.savedMeals) {
    entities.push({ entityType: 'saved_meal', entityId: savedMeal.id });
  }
  for (const recipe of snapshot.library.recipes) {
    entities.push({ entityType: 'recipe', entityId: recipe.id });
  }
  if (readAggregateFromSnapshot(snapshot, 'nutrition_plan', NUTRITION_PLAN_ENTITY_ID) !== null) {
    entities.push({ entityType: 'nutrition_plan', entityId: NUTRITION_PLAN_ENTITY_ID });
  }
  return entities;
}

export type WebSnapshotState = WebSnapshot & { linkRecords: WebLinkRecord[] };

export function applyAggregateToSnapshot(state: WebSnapshotState, aggregate: SyncAggregate): WebSnapshotState {
  switch (aggregate.type) {
    case 'meal': {
      const record = {
        ...aggregate.meal,
        ...(aggregate.source === null ? {} : { [MEAL_ENTRY_SOURCE_RECORD_KEY]: aggregate.source }),
      };
      const others = state.mealRecords.filter((candidate) => !(isRecord(candidate) && candidate.id === aggregate.id));
      return { ...state, mealRecords: [record, ...others] };
    }
    case 'food': {
      const foods = [...state.library.foods.filter((food) => food.id !== aggregate.id), aggregate.food];
      const keptLinks = state.linkRecords.filter(
        (link) => link.foodId !== aggregate.id && !aggregate.barcodes.some((entry) => entry.barcode === link.barcode),
      );
      const links = [...keptLinks, ...aggregate.barcodes.map((entry) => ({ barcode: entry.barcode, foodId: aggregate.id, linkedAt: entry.linkedAt }))];
      return { ...state, library: { ...state.library, foods }, linkRecords: links, links };
    }
    case 'saved_meal': {
      const savedMeals = [...state.library.savedMeals.filter((meal) => meal.id !== aggregate.id), aggregate.savedMeal];
      return { ...state, library: { ...state.library, savedMeals } };
    }
    case 'recipe': {
      const recipes = [...state.library.recipes.filter((recipe) => recipe.id !== aggregate.id), aggregate.recipe];
      return { ...state, library: { ...state.library, recipes } };
    }
    case 'nutrition_plan':
      return { ...state, plan: aggregate.plan };
  }
}

export function removeEntityFromSnapshot(state: WebSnapshotState, entityType: SyncEntityType, entityId: string): WebSnapshotState {
  switch (entityType) {
    case 'meal':
      return { ...state, mealRecords: state.mealRecords.filter((record) => !(isRecord(record) && record.id === entityId)) };
    case 'food': {
      const foods = state.library.foods.filter((food) => food.id !== entityId);
      const links = state.linkRecords.filter((link) => link.foodId !== entityId);
      const savedMeals = state.library.savedMeals.map((meal) => ({
        ...meal,
        items: meal.items.map((item) => (item.foodId === entityId ? { ...item, foodId: null } : item)),
      }));
      const recipes = state.library.recipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients.map((item) => (item.foodId === entityId ? { ...item, foodId: null } : item)),
      }));
      return { ...state, library: { foods, savedMeals, recipes }, linkRecords: links, links };
    }
    case 'saved_meal':
      return { ...state, library: { ...state.library, savedMeals: state.library.savedMeals.filter((meal) => meal.id !== entityId) } };
    case 'recipe':
      return { ...state, library: { ...state.library, recipes: state.library.recipes.filter((recipe) => recipe.id !== entityId) } };
    case 'nutrition_plan':
      return { ...state, plan: EMPTY_NUTRITION_PLAN };
  }
}

export function serializeLibrary(library: LibraryState): string {
  return JSON.stringify({
    version: LIBRARY_STORAGE_VERSION,
    foods: library.foods,
    savedMeals: library.savedMeals,
    recipes: library.recipes,
  });
}

export function serializeLinks(links: readonly WebLinkRecord[]): string {
  return JSON.stringify({ version: FOOD_BARCODE_LINKS_STORAGE_VERSION, links });
}

export function serializePlan(plan: NutritionPlan): string {
  return JSON.stringify({
    profile: plan.profile,
    goals: plan.goals,
    onboardingStatus: plan.onboardingStatus,
  });
}

export function readSnapshotFrom(values: {
  meals: string | null;
  library: string | null;
  links: string | null;
  plan: string | null;
}): WebSnapshotState {
  const library = values.library === null ? { foods: [], savedMeals: [], recipes: [] } : parseLibraryState(values.library).state;
  const linkRecords = values.links === null ? [] : parseFoodBarcodeLinks(values.links).links;
  return {
    mealRecords: parseMealRecords(values.meals),
    library,
    links: linkRecords,
    linkRecords,
    plan: parseNutritionPlanValue(values.plan),
  };
}
