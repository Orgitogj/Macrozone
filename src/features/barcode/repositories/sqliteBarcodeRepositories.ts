import { CACHE_POLICY } from '@/features/barcode/constants';
import {
  ProductCacheError,
  type FoodBarcodeLinkRepository,
  type ProductCacheRepository,
} from '@/features/barcode/repositories/productCacheRepository';
import type { CachedLookup } from '@/features/barcode/types';
import { parseCachedProduct } from '@/features/barcode/utils/productCachePayload';
import type { SqlDatabase } from '@/storage/database/types';
import { createSerialQueue, type SerialQueue } from '@/utils/serialQueue';

type CacheRow = {
  provider: string;
  barcode: string;
  status: string;
  payload_version: number;
  payload_json: string | null;
  fetched_at: string;
  stale_at: string;
  expires_at: string;
};

function rowToCachedLookup(row: CacheRow): CachedLookup | null {
  if (row.payload_version !== CACHE_POLICY.payloadVersion) {
    return null;
  }
  const times = { fetchedAt: row.fetched_at, staleAt: row.stale_at, expiresAt: row.expires_at };
  if (row.status === 'not_found') {
    return row.payload_json === null ? { status: 'not_found', ...times } : null;
  }
  if (row.status !== 'found' || row.payload_json === null) {
    return null;
  }
  let payload: unknown;
  try {
    payload = JSON.parse(row.payload_json);
  } catch {
    return null;
  }
  const product = parseCachedProduct(payload, row.barcode);
  return product === null ? null : { status: 'found', product, ...times };
}

export function createSqliteProductCacheRepository(
  getDatabase: () => Promise<SqlDatabase>,
  { queue = createSerialQueue(), maxEntries = CACHE_POLICY.maxEntries }: { queue?: SerialQueue; maxEntries?: number } = {},
): ProductCacheRepository {
  return {
    get: async (provider, barcode) => {
      let row: CacheRow | null;
      try {
        const database = await getDatabase();
        row = await database.getFirstAsync<CacheRow>(
          'SELECT provider, barcode, status, payload_version, payload_json, fetched_at, stale_at, expires_at FROM online_product_cache WHERE provider = ? AND barcode = ?',
          [provider, barcode],
        );
      } catch (error) {
        throw new ProductCacheError('read_failed', 'Could not read saved product data on this device.', { cause: error });
      }
      return row ? rowToCachedLookup(row) : null;
    },

    put: (provider, barcode, entry, nowMs) =>
      queue.run(async () => {
        try {
          const database = await getDatabase();
          let written = false;
          await database.withExclusiveTransactionAsync(async (transaction) => {
            const result = await transaction.runAsync(
              `INSERT INTO online_product_cache (provider, barcode, status, payload_version, payload_json, fetched_at, stale_at, expires_at, provider_modified_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT (provider, barcode) DO UPDATE SET
                 status = excluded.status,
                 payload_version = excluded.payload_version,
                 payload_json = excluded.payload_json,
                 fetched_at = excluded.fetched_at,
                 stale_at = excluded.stale_at,
                 expires_at = excluded.expires_at,
                 provider_modified_at = excluded.provider_modified_at
               WHERE excluded.fetched_at >= online_product_cache.fetched_at
                 AND online_product_cache.payload_version <= excluded.payload_version`,
              [
                provider,
                barcode,
                entry.status,
                CACHE_POLICY.payloadVersion,
                entry.status === 'found' ? JSON.stringify(entry.product) : null,
                entry.fetchedAt,
                entry.staleAt,
                entry.expiresAt,
                entry.status === 'found' ? entry.product.providerModifiedAt : null,
              ],
            );
            written = result.changes > 0;
            await transaction.runAsync('DELETE FROM online_product_cache WHERE expires_at <= ?', [new Date(nowMs).toISOString()]);
            await transaction.runAsync(
              `DELETE FROM online_product_cache WHERE (provider, barcode) NOT IN (
                 SELECT provider, barcode FROM online_product_cache
                 ORDER BY fetched_at DESC, provider ASC, barcode ASC
                 LIMIT ?
               )`,
              [maxEntries],
            );
          });
          return written ? 'written' : 'kept_newer';
        } catch (error) {
          throw new ProductCacheError('write_failed', 'Could not save product data on this device.', { cause: error });
        }
      }),
  };
}

export function createSqliteFoodBarcodeLinkRepository(
  getDatabase: () => Promise<SqlDatabase>,
  { queue = createSerialQueue() }: { queue?: SerialQueue } = {},
): FoodBarcodeLinkRepository {
  return {
    getLinkedFoodId: async (barcode) => {
      const database = await getDatabase();
      const row = await database.getFirstAsync<{ food_id: string }>(
        'SELECT b.food_id AS food_id FROM food_barcodes b JOIN foods f ON f.id = b.food_id WHERE b.barcode = ?',
        [barcode],
      );
      return row?.food_id ?? null;
    },

    linkIfUnlinked: (barcode, foodId, nowMs) =>
      queue.run(async () => {
        const database = await getDatabase();
        let linked = false;
        await database.withExclusiveTransactionAsync(async (transaction) => {
          const result = await transaction.runAsync(
            'INSERT INTO food_barcodes (barcode, food_id, linked_at) VALUES (?, ?, ?) ON CONFLICT (barcode) DO NOTHING',
            [barcode, foodId, new Date(nowMs).toISOString()],
          );
          linked = result.changes > 0;
        });
        return linked ? 'linked' : 'already_linked';
      }),
  };
}
