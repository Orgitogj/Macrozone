import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { BARCODE_LIMITS } from '@/features/barcode/constants';
import type { OpenFoodFactsConfig } from '@/features/barcode/providers/openFoodFacts/openFoodFactsConfig';
import { resolveOpenFoodFactsConfig } from '@/features/barcode/providers/openFoodFacts/openFoodFactsConfig';
import { createOpenFoodFactsProvider } from '@/features/barcode/providers/openFoodFacts/openFoodFactsProvider';
import { getBarcodeRepositories } from '@/features/barcode/repositories/getBarcodeRepositories';
import { createBarcodeLogService, type BarcodeLogService } from '@/features/barcode/services/barcodeLogService';
import { createProductLookupService, type ProductLookupService } from '@/features/barcode/services/productLookupService';
import { abortableSleep } from '@/features/barcode/utils/abortableSleep';
import { createRequestRateLimiter } from '@/features/barcode/utils/requestRateLimiter';
import { getLibraryRepositories } from '@/features/library/repositories/getLibraryRepositories';

let services: { lookup: ProductLookupService; log: BarcodeLogService; config: OpenFoodFactsConfig } | null = null;

export function getBarcodeServices(): { lookup: ProductLookupService; log: BarcodeLogService; config: OpenFoodFactsConfig } {
  if (services === null) {
    const config = resolveOpenFoodFactsConfig({
      platform: Platform.OS,
      contact: process.env.EXPO_PUBLIC_OPEN_FOOD_FACTS_CONTACT,
      environment: process.env.EXPO_PUBLIC_OPEN_FOOD_FACTS_ENV,
      appVersion: Constants.expoConfig?.version,
      isDevelopment: __DEV__,
    });
    const repositories = getBarcodeRepositories();
    const provider = createOpenFoodFactsProvider({
      config,
      fetchImpl: (url, init) => fetch(url, init),
      rateLimiter: createRequestRateLimiter({ maxRequests: BARCODE_LIMITS.requestsPerMinute, windowMs: 60_000 }),
      scheduler: { now: () => Date.now(), sleep: abortableSleep, random: Math.random },
    });
    services = {
      config,
      lookup: createProductLookupService({ provider, cache: repositories.cache, now: () => Date.now() }),
      log: createBarcodeLogService({
        repository: repositories.log,
        foods: getLibraryRepositories().foods,
        links: repositories.links,
      }),
    };
  }
  return services;
}
