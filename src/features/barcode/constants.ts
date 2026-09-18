export const BARCODE_LIMITS = {
  maxManualInputLength: 32,
  lookupAttemptTimeoutMs: 10_000,
  lookupTotalTimeoutMs: 15_000,
  maxResponseCharacters: 500_000,
  maxProductNameLength: 200,
  maxBrandLength: 120,
  maxQuantityTextLength: 80,
  maxServingTextLength: 80,
  maxRetryAttempts: 1,
  retryBaseDelayMs: 500,
  requestsPerMinute: 10,
  defaultRateLimitRetryAfterSeconds: 60,
  maxRetryAfterSeconds: 3600,
} as const;

export const CACHE_POLICY = {
  foundFreshMs: 7 * 24 * 60 * 60 * 1000,
  foundExpiresMs: 180 * 24 * 60 * 60 * 1000,
  notFoundMs: 24 * 60 * 60 * 1000,
  maxEntries: 500,
  payloadVersion: 1,
} as const;

export const NUTRITION_CHECKS = {
  kilojoulesPerKilocalorie: 4.184,
  maxMacroGramsPer100: 105,
  maxKilocaloriesPer100: 950,
  servingKcalToleranceAbsolute: 5,
  servingMacroToleranceGrams: 1.5,
  servingRelativeTolerance: 0.12,
  energyMismatchAbsoluteKcal: 40,
  energyMismatchRelative: 0.35,
} as const;

export const OPEN_FOOD_FACTS = {
  providerId: 'open_food_facts',
  displayName: 'Open Food Facts',
  apiVersionPath: '/api/v3.6/product/',
  productionBaseUrl: 'https://world.openfoodfacts.org',
  stagingBaseUrl: 'https://world.openfoodfacts.net',
  stagingAuthorization: 'Basic b2ZmOm9mZg==',
  productPageBaseUrl: 'https://world.openfoodfacts.org/product/',
  websiteUrl: 'https://openfoodfacts.org',
  licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
  contentsLicenseUrl: 'https://opendatacommons.org/licenses/dbcl/1-0/',
  imageLicenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  imageHosts: ['images.openfoodfacts.org', 'images.openfoodfacts.net', 'static.openfoodfacts.org'],
  requestedFields: [
    'code',
    'product_type',
    'product_name',
    'brands',
    'quantity',
    'serving_size',
    'nutrition',
    'selected_images',
    'last_modified_t',
  ],
  applicationName: 'MacroZone',
} as const;

export const SCANNER_BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'itf14'] as const;

export const BARCODE_COPY = {
  dataNotice:
    'Nutrition data from Open Food Facts is added by the community and may be incomplete or out of date. Check it against the package before saving.',
  notMedicalAdvice: 'Nutrition values are estimates for logging, not medical advice.',
  attribution: 'Data from Open Food Facts',
  webUnavailable:
    'Online product lookup works in the Android and iOS apps. On the web you can still enter a barcode to use saved products, or create a food manually.',
  notConfigured:
    'Online product lookup is not set up in this version of MacroZone. You can still use saved products or create a food manually.',
  notConfiguredDeveloper:
    'Developer setup: set EXPO_PUBLIC_OPEN_FOOD_FACTS_CONTACT to a public project or support contact (an email address or HTTPS URL). It is compiled into the app and can be inspected by anyone, so never use a private personal email address.',
} as const;

export function describeNotConfigured(isDevelopment: boolean): string {
  return isDevelopment ? `${BARCODE_COPY.notConfigured} ${BARCODE_COPY.notConfiguredDeveloper}` : BARCODE_COPY.notConfigured;
}
