import type { MacroKey } from '@/types/nutrition';

export type OnlineProviderId = 'open_food_facts';

export type NutrientReading =
  | { status: 'value'; value: number; approximate: boolean; convertedFromKilojoules: boolean }
  | { status: 'missing' }
  | { status: 'estimated' }
  | { status: 'invalid' };

export type NutrientReadings = Record<MacroKey, NutrientReading>;

export type Per100Nutrition = {
  unit: 'g' | 'ml';
  readings: NutrientReadings;
};

export type ServingNutrition = {
  quantity: number;
  unit: 'g' | 'ml';
  readings: NutrientReadings;
};

export type OnlineProductWarning =
  | 'estimated_values'
  | 'approximate_values'
  | 'prepared_only'
  | 'serving_inconsistent'
  | 'impossible_values'
  | 'energy_mismatch'
  | 'energy_from_kilojoules'
  | 'no_nutrition'
  | 'name_missing'
  | 'name_shortened';

export type OnlineProduct = {
  provider: OnlineProviderId;
  barcode: string;
  name: string | null;
  brand: string | null;
  quantityText: string | null;
  servingText: string | null;
  imageUrl: string | null;
  sourceUrl: string;
  providerModifiedAt: string | null;
  per100: Per100Nutrition | null;
  serving: ServingNutrition | null;
  preparedOnly: boolean;
};

export type ProviderFailureCode = 'offline' | 'timeout' | 'rate_limited' | 'unavailable' | 'malformed' | 'not_configured' | 'unsupported_platform' | 'cancelled';

export type ProviderLookupOutcome =
  | { status: 'found'; product: OnlineProduct }
  | { status: 'not_found' }
  | { status: 'failed'; code: ProviderFailureCode; retryable: boolean; retryAfterSeconds: number | null };

export type BasisId = 'per100g' | 'per100ml' | 'serving' | 'manual';

export type ManualBasisUnit = 'g' | 'ml' | 'serving';

export type BasisNutrition = Record<MacroKey, number | null>;

export type BasisOption = {
  id: Exclude<BasisId, 'manual'>;
  servingAmount: number;
  servingUnit: 'g' | 'ml' | 'serving';
  servingQuantity: number | null;
  servingQuantityUnit: 'g' | 'ml' | null;
  nutrition: BasisNutrition;
  missing: MacroKey[];
  approximate: MacroKey[];
  convertedFromKilojoules: boolean;
};

export type MappedProductNutrition = {
  bases: BasisOption[];
  warnings: OnlineProductWarning[];
};

export type CachedLookup =
  | { status: 'found'; product: OnlineProduct; fetchedAt: string; staleAt: string; expiresAt: string }
  | { status: 'not_found'; fetchedAt: string; staleAt: string; expiresAt: string };

export type LookupResult =
  | { status: 'found'; product: OnlineProduct; origin: 'network' | 'cache'; fetchedAt: string; stale: boolean; refreshFailure: ProviderFailureCode | null }
  | { status: 'not_found'; origin: 'network' | 'cache'; fetchedAt: string }
  | {
      status: 'failed';
      code: ProviderFailureCode;
      retryable: boolean;
      retryAfterSeconds: number | null;
      expiredCache: { product: OnlineProduct; fetchedAt: string } | null;
    };
