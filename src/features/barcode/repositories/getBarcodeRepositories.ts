import type { BarcodeLogRepository } from '@/features/barcode/repositories/barcodeLogRepository';
import type { FoodBarcodeLinkRepository, ProductCacheRepository } from '@/features/barcode/repositories/productCacheRepository';
import { createSqliteBarcodeLogRepository } from '@/features/barcode/repositories/sqliteBarcodeLogRepository';
import {
  createSqliteFoodBarcodeLinkRepository,
  createSqliteProductCacheRepository,
} from '@/features/barcode/repositories/sqliteBarcodeRepositories';
import { loadReadyMealDatabase } from '@/features/meals/repositories/getMealRepository';
import { localDataWriteQueue } from '@/storage/database/writeQueue';

const repositories = {
  cache: createSqliteProductCacheRepository(loadReadyMealDatabase, { queue: localDataWriteQueue }),
  links: createSqliteFoodBarcodeLinkRepository(loadReadyMealDatabase, { queue: localDataWriteQueue }),
  log: createSqliteBarcodeLogRepository(loadReadyMealDatabase, { queue: localDataWriteQueue }),
};

export function getBarcodeRepositories(): { cache: ProductCacheRepository; links: FoodBarcodeLinkRepository; log: BarcodeLogRepository } {
  return repositories;
}
