import type { CachedLookup, OnlineProviderId } from '@/features/barcode/types';

export type CacheWriteResult = 'written' | 'kept_newer';

export type ProductCacheRepository = {
  get(provider: OnlineProviderId, barcode: string): Promise<CachedLookup | null>;
  put(provider: OnlineProviderId, barcode: string, entry: CachedLookup, nowMs: number): Promise<CacheWriteResult>;
};

export class ProductCacheError extends Error {
  readonly code: 'read_failed' | 'write_failed' | 'unsupported_version';

  constructor(code: 'read_failed' | 'write_failed' | 'unsupported_version', message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ProductCacheError';
    this.code = code;
  }
}

export type FoodBarcodeLinkRepository = {
  getLinkedFoodId(barcode: string): Promise<string | null>;
  linkIfUnlinked(barcode: string, foodId: string, nowMs: number): Promise<'linked' | 'already_linked'>;
};
