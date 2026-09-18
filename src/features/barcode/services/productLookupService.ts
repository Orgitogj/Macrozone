import type { OnlineFoodProvider } from '@/features/barcode/providers/onlineFoodProvider';
import type { ProductCacheRepository } from '@/features/barcode/repositories/productCacheRepository';
import type { CachedLookup, LookupResult } from '@/features/barcode/types';
import { buildCacheEntry } from '@/features/barcode/utils/productCachePayload';

export type ProductLookupService = {
  lookup(barcode: string, options: { signal: AbortSignal; forceRefresh: boolean }): Promise<LookupResult>;
  availability: OnlineFoodProvider['availability'];
  providerName: string;
};

export function createProductLookupService({
  provider,
  cache,
  now,
}: {
  provider: OnlineFoodProvider;
  cache: ProductCacheRepository;
  now: () => number;
}): ProductLookupService {
  const readCache = async (barcode: string): Promise<CachedLookup | null> => {
    try {
      return await cache.get(provider.id, barcode);
    } catch {
      return null;
    }
  };

  return {
    providerName: provider.displayName,
    availability: () => provider.availability(),

    lookup: async (barcode, { signal, forceRefresh }) => {
      const startedAt = now();
      const nowIso = new Date(startedAt).toISOString();
      const cached = await readCache(barcode);
      const usable = cached !== null && cached.expiresAt > nowIso ? cached : null;

      if (usable !== null && !forceRefresh && usable.staleAt > nowIso) {
        return usable.status === 'found'
          ? { status: 'found', product: usable.product, origin: 'cache', fetchedAt: usable.fetchedAt, stale: false, refreshFailure: null }
          : { status: 'not_found', origin: 'cache', fetchedAt: usable.fetchedAt };
      }

      const outcome = await provider.lookupBarcode(barcode, { signal });

      if (outcome.status === 'failed') {
        if (outcome.code !== 'cancelled' && usable !== null && usable.status === 'found') {
          return {
            status: 'found',
            product: usable.product,
            origin: 'cache',
            fetchedAt: usable.fetchedAt,
            stale: true,
            refreshFailure: outcome.code,
          };
        }
        return {
          status: 'failed',
          code: outcome.code,
          retryable: outcome.retryable,
          retryAfterSeconds: outcome.retryAfterSeconds,
          expiredCache:
            outcome.code !== 'cancelled' && cached !== null && cached.status === 'found' && usable === null
              ? { product: cached.product, fetchedAt: cached.fetchedAt }
              : null,
        };
      }

      const entry = buildCacheEntry(outcome, startedAt);
      await cache.put(provider.id, barcode, entry, now()).catch(() => 'kept_newer' as const);
      return outcome.status === 'found'
        ? { status: 'found', product: outcome.product, origin: 'network', fetchedAt: entry.fetchedAt, stale: false, refreshFailure: null }
        : { status: 'not_found', origin: 'network', fetchedAt: entry.fetchedAt };
    },
  };
}
