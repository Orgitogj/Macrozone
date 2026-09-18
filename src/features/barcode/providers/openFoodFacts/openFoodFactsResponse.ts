import { BARCODE_LIMITS, OPEN_FOOD_FACTS } from '@/features/barcode/constants';
import type { NutrientReading, NutrientReadings, OnlineProduct, ProviderLookupOutcome, ServingNutrition } from '@/features/barcode/types';
import { canonicalizeForOpenFoodFacts } from '@/features/barcode/utils/gtin';
import { kilojoulesToKilocalories } from '@/features/barcode/utils/nutritionBasis';
import { roundNutritionValue } from '@/features/library/utils/nutritionMath';

type JsonRecord = Record<string, unknown>;

const APPROXIMATE_MODIFIERS: readonly string[] = ['<', '<=', '>', '>=', '~'];

const LABEL_SOURCES: readonly string[] = ['manufacturer', 'packaging'];

const MIN_PLAUSIBLE_TIMESTAMP = 946_684_800;

const MAX_PLAUSIBLE_TIMESTAMP = 4_102_444_800;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function cleanProviderText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  let result = '';
  for (const char of value) {
    const code = char.charCodeAt(0);
    result += code < 32 || code === 127 ? ' ' : char;
  }
  const cleaned = result.replace(/\s+/g, ' ').trim();
  if (cleaned.length === 0) {
    return null;
  }
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength).trimEnd() : cleaned;
}

export function readNutrient(nutrients: unknown, key: string, expectedUnit: string): NutrientReading {
  if (!isRecord(nutrients) || !(key in nutrients)) {
    return { status: 'missing' };
  }
  const entry = nutrients[key];
  if (!isRecord(entry)) {
    return { status: 'invalid' };
  }
  if (entry.source === 'estimate') {
    return { status: 'estimated' };
  }
  if (entry.value === undefined || entry.value === null) {
    return { status: 'missing' };
  }
  if (typeof entry.value !== 'number' || !Number.isFinite(entry.value) || entry.value < 0) {
    return { status: 'invalid' };
  }
  if (entry.unit !== undefined && entry.unit !== expectedUnit) {
    return { status: 'invalid' };
  }
  if (entry.modifier !== undefined && (typeof entry.modifier !== 'string' || !APPROXIMATE_MODIFIERS.includes(entry.modifier))) {
    return { status: 'invalid' };
  }
  return {
    status: 'value',
    value: roundNutritionValue(entry.value),
    approximate: entry.modifier !== undefined,
    convertedFromKilojoules: false,
  };
}

export function readEnergy(nutrients: unknown): NutrientReading {
  const kilocalories = readNutrient(nutrients, 'energy-kcal', 'kcal');
  if (kilocalories.status !== 'missing') {
    return kilocalories;
  }
  const kilojoules = readNutrient(nutrients, 'energy-kj', 'kJ');
  if (kilojoules.status !== 'value') {
    return kilojoules;
  }
  return {
    status: 'value',
    value: kilojoulesToKilocalories(kilojoules.value),
    approximate: kilojoules.approximate,
    convertedFromKilojoules: true,
  };
}

export function readMacroSet(nutrients: unknown): NutrientReadings {
  return {
    calories: readEnergy(nutrients),
    protein: readNutrient(nutrients, 'proteins', 'g'),
    carbs: readNutrient(nutrients, 'carbohydrates', 'g'),
    fat: readNutrient(nutrients, 'fat', 'g'),
  };
}

function readServingSet(inputSets: unknown): ServingNutrition | null {
  if (!Array.isArray(inputSets)) {
    return null;
  }
  const candidates = inputSets.filter(
    (set): set is JsonRecord =>
      isRecord(set) &&
      set.per === 'serving' &&
      set.preparation === 'as_sold' &&
      typeof set.source === 'string' &&
      LABEL_SOURCES.includes(set.source) &&
      typeof set.per_quantity === 'number' &&
      Number.isFinite(set.per_quantity) &&
      set.per_quantity > 0 &&
      set.per_quantity <= 10_000 &&
      (set.per_unit === 'g' || set.per_unit === 'ml'),
  );
  candidates.sort((a, b) => LABEL_SOURCES.indexOf(String(a.source)) - LABEL_SOURCES.indexOf(String(b.source)));
  const chosen = candidates[0];
  if (!chosen) {
    return null;
  }
  return {
    quantity: roundNutritionValue(chosen.per_quantity as number),
    unit: chosen.per_unit as 'g' | 'ml',
    readings: readMacroSet(chosen.nutrients),
  };
}

export function readImageUrl(selectedImages: unknown): string | null {
  if (!isRecord(selectedImages) || !isRecord(selectedImages.front) || !isRecord(selectedImages.front.best)) {
    return null;
  }
  const best = selectedImages.front.best;
  for (const size of ['400', '200']) {
    const candidate = best[size];
    if (typeof candidate === 'string' && isAllowedImageUrl(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function isAllowedImageUrl(url: string): boolean {
  const match = /^https:\/\/([A-Za-z0-9.-]+)(\/[A-Za-z0-9._~/%-]*)$/.exec(url);
  if (!match || url.length > 500) {
    return false;
  }
  return (OPEN_FOOD_FACTS.imageHosts as readonly string[]).includes(match[1].toLowerCase());
}

function readTimestamp(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < MIN_PLAUSIBLE_TIMESTAMP || value > MAX_PLAUSIBLE_TIMESTAMP) {
    return null;
  }
  return new Date(value * 1000).toISOString();
}

export function mapOpenFoodFactsProduct(product: JsonRecord, barcode: string): OnlineProduct {
  const nutrition = isRecord(product.nutrition) ? product.nutrition : null;
  const aggregated = nutrition && isRecord(nutrition.aggregated_set) ? nutrition.aggregated_set : null;
  const aggregatedUsable = aggregated !== null && aggregated.preparation === 'as_sold' && (aggregated.per === '100g' || aggregated.per === '100ml');
  return {
    provider: 'open_food_facts',
    barcode,
    name: cleanProviderText(product.product_name, BARCODE_LIMITS.maxProductNameLength),
    brand: cleanProviderText(product.brands, BARCODE_LIMITS.maxBrandLength),
    quantityText: cleanProviderText(product.quantity, BARCODE_LIMITS.maxQuantityTextLength),
    servingText: cleanProviderText(product.serving_size, BARCODE_LIMITS.maxServingTextLength),
    imageUrl: readImageUrl(product.selected_images),
    sourceUrl: `${OPEN_FOOD_FACTS.productPageBaseUrl}${barcode}`,
    providerModifiedAt: readTimestamp(product.last_modified_t),
    per100: aggregatedUsable
      ? { unit: aggregated.per === '100g' ? 'g' : 'ml', readings: readMacroSet(aggregated.nutrients) }
      : null,
    serving: nutrition ? readServingSet(nutrition.input_sets) : null,
    preparedOnly: aggregated !== null && aggregated.preparation === 'prepared',
  };
}

export function parseOpenFoodFactsResponse(httpStatus: number, bodyText: string, requestedBarcode: string): ProviderLookupOutcome {
  if (httpStatus === 404) {
    return { status: 'not_found' };
  }
  if (httpStatus !== 200) {
    return { status: 'failed', code: 'malformed', retryable: false, retryAfterSeconds: null };
  }
  const malformed: ProviderLookupOutcome = { status: 'failed', code: 'malformed', retryable: true, retryAfterSeconds: null };
  if (bodyText.length === 0 || bodyText.length > BARCODE_LIMITS.maxResponseCharacters) {
    return malformed;
  }
  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return malformed;
  }
  if (!isRecord(body) || typeof body.status !== 'string') {
    return malformed;
  }
  const resultId = isRecord(body.result) ? body.result.id : undefined;
  if (body.status === 'failure') {
    return resultId === 'product_not_found' ? { status: 'not_found' } : malformed;
  }
  if (body.status !== 'success' && body.status !== 'success_with_warnings' && body.status !== 'success_with_errors') {
    return malformed;
  }
  const product = body.product;
  if (!isRecord(product) || typeof product.code !== 'string' || !/^[0-9]{1,14}$/.test(product.code)) {
    return malformed;
  }
  if (canonicalizeForOpenFoodFacts(product.code) !== requestedBarcode) {
    return malformed;
  }
  if (product.product_type !== undefined && product.product_type !== 'food') {
    return { status: 'not_found' };
  }
  return { status: 'found', product: mapOpenFoodFactsProduct(product, requestedBarcode) };
}
