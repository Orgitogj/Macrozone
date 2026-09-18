import { BARCODE_LIMITS, CACHE_POLICY } from '@/features/barcode/constants';
import type { CachedLookup, NutrientReading, NutrientReadings, OnlineProduct, Per100Nutrition, ServingNutrition } from '@/features/barcode/types';
import { isCanonicalBarcode } from '@/features/barcode/utils/gtin';
import { isAllowedImageUrl } from '@/features/barcode/providers/openFoodFacts/openFoodFactsResponse';
import { MACRO_KEYS } from '@/types/nutrition';

type JsonRecord = Record<string, unknown>;

export type ProductCacheRecord = {
  provider: 'open_food_facts';
  barcode: string;
  payloadVersion: number;
  entry: CachedLookup;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && !Number.isNaN(Date.parse(value));
}

function isOptionalText(value: unknown, maxLength: number): value is string | null {
  return value === null || (typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength);
}

function parseReading(value: unknown): NutrientReading | null {
  if (!isRecord(value)) {
    return null;
  }
  switch (value.status) {
    case 'missing':
    case 'estimated':
    case 'invalid':
      return { status: value.status };
    case 'value':
      return typeof value.value === 'number' &&
        Number.isFinite(value.value) &&
        value.value >= 0 &&
        typeof value.approximate === 'boolean' &&
        typeof value.convertedFromKilojoules === 'boolean'
        ? { status: 'value', value: value.value, approximate: value.approximate, convertedFromKilojoules: value.convertedFromKilojoules }
        : null;
    default:
      return null;
  }
}

function parseReadings(value: unknown): NutrientReadings | null {
  if (!isRecord(value)) {
    return null;
  }
  const readings: Partial<NutrientReadings> = {};
  for (const key of MACRO_KEYS) {
    const reading = parseReading(value[key]);
    if (reading === null) {
      return null;
    }
    readings[key] = reading;
  }
  return readings as NutrientReadings;
}

function parsePer100(value: unknown): Per100Nutrition | null | undefined {
  if (value === null) {
    return null;
  }
  if (!isRecord(value) || (value.unit !== 'g' && value.unit !== 'ml')) {
    return undefined;
  }
  const readings = parseReadings(value.readings);
  return readings === null ? undefined : { unit: value.unit, readings };
}

function parseServing(value: unknown): ServingNutrition | null | undefined {
  if (value === null) {
    return null;
  }
  if (
    !isRecord(value) ||
    (value.unit !== 'g' && value.unit !== 'ml') ||
    typeof value.quantity !== 'number' ||
    !Number.isFinite(value.quantity) ||
    value.quantity <= 0
  ) {
    return undefined;
  }
  const readings = parseReadings(value.readings);
  return readings === null ? undefined : { quantity: value.quantity, unit: value.unit, readings };
}

export function parseCachedProduct(value: unknown, barcode: string): OnlineProduct | null {
  if (!isRecord(value) || value.provider !== 'open_food_facts' || value.barcode !== barcode || !isCanonicalBarcode(value.barcode)) {
    return null;
  }
  const per100 = parsePer100(value.per100);
  const serving = parseServing(value.serving);
  if (
    per100 === undefined ||
    serving === undefined ||
    !isOptionalText(value.name, BARCODE_LIMITS.maxProductNameLength) ||
    !isOptionalText(value.brand, BARCODE_LIMITS.maxBrandLength) ||
    !isOptionalText(value.quantityText, BARCODE_LIMITS.maxQuantityTextLength) ||
    !isOptionalText(value.servingText, BARCODE_LIMITS.maxServingTextLength) ||
    !(value.imageUrl === null || (typeof value.imageUrl === 'string' && isAllowedImageUrl(value.imageUrl))) ||
    typeof value.sourceUrl !== 'string' ||
    !value.sourceUrl.startsWith('https://') ||
    !(value.providerModifiedAt === null || isTimestamp(value.providerModifiedAt)) ||
    typeof value.preparedOnly !== 'boolean'
  ) {
    return null;
  }
  return {
    provider: 'open_food_facts',
    barcode,
    name: value.name,
    brand: value.brand,
    quantityText: value.quantityText,
    servingText: value.servingText,
    imageUrl: value.imageUrl,
    sourceUrl: value.sourceUrl,
    providerModifiedAt: value.providerModifiedAt,
    per100,
    serving,
    preparedOnly: value.preparedOnly,
  };
}

export function parseCacheTimes(value: JsonRecord): { fetchedAt: string; staleAt: string; expiresAt: string } | null {
  const { fetchedAt, staleAt, expiresAt } = value;
  if (!isTimestamp(fetchedAt) || !isTimestamp(staleAt) || !isTimestamp(expiresAt) || staleAt > expiresAt) {
    return null;
  }
  return { fetchedAt, staleAt, expiresAt };
}

export function buildCacheEntry(
  outcome: { status: 'found'; product: OnlineProduct } | { status: 'not_found' },
  fetchedAtMs: number,
): CachedLookup {
  const fetchedAt = new Date(fetchedAtMs).toISOString();
  if (outcome.status === 'found') {
    return {
      status: 'found',
      product: outcome.product,
      fetchedAt,
      staleAt: new Date(fetchedAtMs + CACHE_POLICY.foundFreshMs).toISOString(),
      expiresAt: new Date(fetchedAtMs + CACHE_POLICY.foundExpiresMs).toISOString(),
    };
  }
  const until = new Date(fetchedAtMs + CACHE_POLICY.notFoundMs).toISOString();
  return { status: 'not_found', fetchedAt, staleAt: until, expiresAt: until };
}

export function selectEntriesToKeep<T extends { provider: string; barcode: string; fetchedAt: string; expiresAt: string }>(
  entries: readonly T[],
  nowIso: string,
  maxEntries: number,
): T[] {
  return entries
    .filter((entry) => entry.expiresAt > nowIso)
    .sort((a, b) =>
      a.fetchedAt !== b.fetchedAt
        ? a.fetchedAt > b.fetchedAt
          ? -1
          : 1
        : a.provider !== b.provider
          ? a.provider < b.provider
            ? -1
            : 1
          : a.barcode < b.barcode
            ? -1
            : a.barcode > b.barcode
              ? 1
              : 0,
    )
    .slice(0, maxEntries);
}
