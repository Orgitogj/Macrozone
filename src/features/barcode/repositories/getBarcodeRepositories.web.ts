import {
  createAsyncStorageFoodBarcodeLinkRepository,
  createAsyncStorageProductCacheRepository,
} from '@/features/barcode/repositories/asyncStorageBarcodeRepositories';
import { createAsyncStorageBarcodeLogRepository } from '@/features/barcode/repositories/asyncStorageBarcodeLogRepository';
import type { BarcodeLogRepository } from '@/features/barcode/repositories/barcodeLogRepository';
import type { FoodBarcodeLinkRepository, ProductCacheRepository } from '@/features/barcode/repositories/productCacheRepository';
import { getLibraryRepositories } from '@/features/library/repositories/getLibraryRepositories';

const repositories = {
  cache: createAsyncStorageProductCacheRepository(),
  links: createAsyncStorageFoodBarcodeLinkRepository({
    foodExists: async (foodId) => (await getLibraryRepositories().foods.getFood(foodId)) !== null,
  }),
  log: createAsyncStorageBarcodeLogRepository(),
};

export function getBarcodeRepositories(): { cache: ProductCacheRepository; links: FoodBarcodeLinkRepository; log: BarcodeLogRepository } {
  return repositories;
}
