import { LIBRARY_LIMITS } from '@/features/library/constants';
import { parseFoodRecord, parseRecipeRecord, parseSavedMealRecord } from '@/features/library/utils/libraryRecords';
import {
  isOnboardingStatus,
  parseBodyProfile,
  parseSavedGoals,
} from '@/features/nutrition-goals/repositories/nutritionPlanRepository';
import type { NutritionPlan } from '@/features/nutrition-goals/types';
import { parseStoredMealEntrySource } from '@/features/meals/utils/mealEntrySources';
import { normalizeStoredMeal } from '@/features/meals/utils/mealRecords';
import { NUTRITION_PLAN_ENTITY_ID, SYNC_PAYLOAD_VERSION, type SyncEntityType } from '@/storage/database/syncSchema';
import type { BarcodeLink, SyncAggregate } from '@/features/sync/types';
import { fnv1aChecksum } from '@/utils/checksum';

export const MAX_PAYLOAD_BYTES = 64 * 1024;

const BARCODE_PATTERN = /^[0-9]{8,14}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value ?? null);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalJson(entryValue)}`).join(',')}}`;
}

export function payloadHash(payload: Record<string, unknown> | null): string {
  return payload === null ? 'deleted' : fnv1aChecksum(canonicalJson(payload));
}

export function samePayload(a: Record<string, unknown> | null, b: Record<string, unknown> | null): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

const METADATA_KEYS = new Set(['updatedAt']);

function withoutMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(withoutMetadata);
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !METADATA_KEYS.has(key))
      .map(([key, entryValue]) => [key, withoutMetadata(entryValue)]),
  );
}

export function sameContent(a: Record<string, unknown> | null, b: Record<string, unknown> | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return canonicalJson(withoutMetadata(a)) === canonicalJson(withoutMetadata(b));
}

export function encodeAggregate(aggregate: SyncAggregate): Record<string, unknown> {
  switch (aggregate.type) {
    case 'meal':
      return { meal: { ...aggregate.meal }, source: aggregate.source === null ? null : { ...aggregate.source } };
    case 'food':
      return { food: { ...aggregate.food }, barcodes: aggregate.barcodes.map((link) => ({ ...link })) };
    case 'saved_meal':
      return { savedMeal: { ...aggregate.savedMeal } };
    case 'recipe':
      return { recipe: { ...aggregate.recipe } };
    case 'nutrition_plan':
      return {
        profile: aggregate.plan.profile === null ? null : { ...aggregate.plan.profile },
        goals: aggregate.plan.goals === null ? null : { ...aggregate.plan.goals },
        onboardingStatus: aggregate.plan.onboardingStatus,
      };
  }
}

function decodeBarcodes(value: unknown): BarcodeLink[] | null {
  if (!Array.isArray(value) || value.length > LIBRARY_LIMITS.maxSavedMealItems) {
    return null;
  }
  const links: BarcodeLink[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.barcode !== 'string' || !BARCODE_PATTERN.test(entry.barcode) || !isTimestamp(entry.linkedAt)) {
      return null;
    }
    if (seen.has(entry.barcode)) {
      return null;
    }
    seen.add(entry.barcode);
    links.push({ barcode: entry.barcode, linkedAt: entry.linkedAt });
  }
  return links;
}

function decodeNutritionPlan(payload: Record<string, unknown>): NutritionPlan | null {
  const profile = payload.profile === null || payload.profile === undefined ? null : parseBodyProfile(payload.profile);
  const goals = payload.goals === null || payload.goals === undefined ? null : parseSavedGoals(payload.goals);
  const onboardingStatus =
    payload.onboardingStatus === null || payload.onboardingStatus === undefined
      ? null
      : isOnboardingStatus(payload.onboardingStatus)
        ? payload.onboardingStatus
        : undefined;
  if (onboardingStatus === undefined) {
    return null;
  }
  if (payload.profile !== null && payload.profile !== undefined && profile === null) {
    return null;
  }
  if (payload.goals !== null && payload.goals !== undefined && goals === null) {
    return null;
  }
  return { profile, goals, onboardingStatus };
}

export function decodeAggregate(
  entityType: SyncEntityType,
  entityId: string,
  payloadVersion: number,
  payload: unknown,
): SyncAggregate | null {
  if (payloadVersion !== SYNC_PAYLOAD_VERSION || !isRecord(payload)) {
    return null;
  }
  switch (entityType) {
    case 'meal': {
      const meal = normalizeStoredMeal(payload.meal);
      if (meal === null || meal.id !== entityId) {
        return null;
      }
      const rawSource = payload.source;
      if (rawSource === null || rawSource === undefined) {
        return { type: 'meal', id: entityId, meal, source: null };
      }
      const source = parseStoredMealEntrySource(rawSource);
      return source === null ? null : { type: 'meal', id: entityId, meal, source };
    }
    case 'food': {
      const food = parseFoodRecord(payload.food);
      const barcodes = decodeBarcodes(payload.barcodes ?? []);
      return food === null || food.id !== entityId || barcodes === null ? null : { type: 'food', id: entityId, food, barcodes };
    }
    case 'saved_meal': {
      const savedMeal = parseSavedMealRecord(payload.savedMeal);
      return savedMeal === null || savedMeal.id !== entityId ? null : { type: 'saved_meal', id: entityId, savedMeal };
    }
    case 'recipe': {
      const recipe = parseRecipeRecord(payload.recipe);
      return recipe === null || recipe.id !== entityId ? null : { type: 'recipe', id: entityId, recipe };
    }
    case 'nutrition_plan': {
      if (entityId !== NUTRITION_PLAN_ENTITY_ID) {
        return null;
      }
      const plan = decodeNutritionPlan(payload);
      return plan === null ? null : { type: 'nutrition_plan', id: entityId, plan };
    }
  }
}

export function isPayloadWithinLimits(payload: Record<string, unknown>): boolean {
  return canonicalJson(payload).length <= MAX_PAYLOAD_BYTES;
}
