import AsyncStorage from '@react-native-async-storage/async-storage';

import { CACHE_POLICY } from '@/features/barcode/constants';
import {
  ProductCacheError,
  type FoodBarcodeLinkRepository,
  type ProductCacheRepository,
} from '@/features/barcode/repositories/productCacheRepository';
import type { CachedLookup } from '@/features/barcode/types';
import { isCanonicalBarcode } from '@/features/barcode/utils/gtin';
import { parseCachedProduct, parseCacheTimes, selectEntriesToKeep } from '@/features/barcode/utils/productCachePayload';
import { localDataWriteQueue } from '@/storage/database/writeQueue';
import type { SerialQueue } from '@/utils/serialQueue';

export const PRODUCT_CACHE_STORAGE_KEY = 'online_product_cache';

export const PRODUCT_CACHE_BACKUP_STORAGE_KEY = 'online_product_cache_unreadable_backup';

export const PRODUCT_CACHE_STORAGE_VERSION = 1;

export const FOOD_BARCODE_LINKS_STORAGE_KEY = 'food_barcode_links';

export const FOOD_BARCODE_LINKS_BACKUP_STORAGE_KEY = 'food_barcode_links_unreadable_backup';

export const FOOD_BARCODE_LINKS_STORAGE_VERSION = 1;

type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

type StoredCacheEntry = {
  provider: 'open_food_facts';
  barcode: string;
  fetchedAt: string;
  expiresAt: string;
  entry: CachedLookup;
};

type StoredLink = { barcode: string; foodId: string; linkedAt: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseProductCacheState(raw: string | null): { entries: StoredCacheEntry[]; clean: boolean } {
  if (raw === null) {
    return { entries: [], clean: true };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { entries: [], clean: false };
  }
  if (!isRecord(parsed) || typeof parsed.version !== 'number' || !Array.isArray(parsed.entries)) {
    return { entries: [], clean: false };
  }
  if (parsed.version > PRODUCT_CACHE_STORAGE_VERSION) {
    throw new ProductCacheError('unsupported_version', 'Saved product data was created by a newer version of MacroZone.');
  }
  if (parsed.version !== PRODUCT_CACHE_STORAGE_VERSION) {
    return { entries: [], clean: false };
  }
  const entries: StoredCacheEntry[] = [];
  const seen = new Set<string>();
  let clean = true;
  for (const value of parsed.entries) {
    if (!isRecord(value) || value.provider !== 'open_food_facts' || !isCanonicalBarcode(value.barcode) || seen.has(value.barcode)) {
      clean = false;
      continue;
    }
    const times = parseCacheTimes(value);
    if (times === null || value.payloadVersion !== CACHE_POLICY.payloadVersion) {
      clean = false;
      continue;
    }
    let entry: CachedLookup | null = null;
    if (value.status === 'not_found' && value.product === null) {
      entry = { status: 'not_found', ...times };
    } else if (value.status === 'found') {
      const product = parseCachedProduct(value.product, value.barcode);
      entry = product === null ? null : { status: 'found', product, ...times };
    }
    if (entry === null) {
      clean = false;
      continue;
    }
    seen.add(value.barcode);
    entries.push({ provider: 'open_food_facts', barcode: value.barcode, fetchedAt: times.fetchedAt, expiresAt: times.expiresAt, entry });
  }
  return { entries, clean };
}

function serializeCacheState(entries: readonly StoredCacheEntry[]): string {
  return JSON.stringify({
    version: PRODUCT_CACHE_STORAGE_VERSION,
    entries: entries.map(({ provider, barcode, entry }) => ({
      provider,
      barcode,
      payloadVersion: CACHE_POLICY.payloadVersion,
      status: entry.status,
      product: entry.status === 'found' ? entry.product : null,
      fetchedAt: entry.fetchedAt,
      staleAt: entry.staleAt,
      expiresAt: entry.expiresAt,
    })),
  });
}

export function createAsyncStorageProductCacheRepository({
  storage = AsyncStorage,
  queue = localDataWriteQueue,
  maxEntries = CACHE_POLICY.maxEntries,
}: { storage?: KeyValueStorage; queue?: SerialQueue; maxEntries?: number } = {}): ProductCacheRepository {
  const readRaw = async (): Promise<string | null> => {
    try {
      return await storage.getItem(PRODUCT_CACHE_STORAGE_KEY);
    } catch (error) {
      throw new ProductCacheError('read_failed', 'Could not read saved product data on this device.', { cause: error });
    }
  };

  return {
    get: async (_provider, barcode) => {
      const { entries } = parseProductCacheState(await readRaw());
      return entries.find((stored) => stored.barcode === barcode)?.entry ?? null;
    },

    put: (provider, barcode, entry, nowMs) =>
      queue.run(async () => {
        const raw = await readRaw();
        const { entries, clean } = parseProductCacheState(raw);
        const existing = entries.find((stored) => stored.barcode === barcode);
        if (existing && existing.fetchedAt > entry.fetchedAt) {
          return 'kept_newer';
        }
        const next = selectEntriesToKeep(
          [
            ...entries.filter((stored) => stored.barcode !== barcode),
            { provider, barcode, fetchedAt: entry.fetchedAt, expiresAt: entry.expiresAt, entry },
          ],
          new Date(nowMs).toISOString(),
          maxEntries,
        );
        try {
          if (!clean && raw !== null && (await storage.getItem(PRODUCT_CACHE_BACKUP_STORAGE_KEY)) === null) {
            await storage.setItem(PRODUCT_CACHE_BACKUP_STORAGE_KEY, raw);
          }
          await storage.setItem(PRODUCT_CACHE_STORAGE_KEY, serializeCacheState(next));
        } catch (error) {
          throw new ProductCacheError('write_failed', 'Could not save product data on this device.', { cause: error });
        }
        return 'written';
      }),
  };
}

export function parseFoodBarcodeLinks(raw: string | null): { links: StoredLink[]; clean: boolean } {
  if (raw === null) {
    return { links: [], clean: true };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { links: [], clean: false };
  }
  if (!isRecord(parsed) || typeof parsed.version !== 'number' || !Array.isArray(parsed.links)) {
    return { links: [], clean: false };
  }
  if (parsed.version > FOOD_BARCODE_LINKS_STORAGE_VERSION) {
    throw new ProductCacheError('unsupported_version', 'Saved barcode links were created by a newer version of MacroZone.');
  }
  if (parsed.version !== FOOD_BARCODE_LINKS_STORAGE_VERSION) {
    return { links: [], clean: false };
  }
  const links: StoredLink[] = [];
  let clean = true;
  for (const value of parsed.links) {
    if (
      !isRecord(value) ||
      !isCanonicalBarcode(value.barcode) ||
      typeof value.foodId !== 'string' ||
      value.foodId.length === 0 ||
      typeof value.linkedAt !== 'string' ||
      links.some((link) => link.barcode === value.barcode)
    ) {
      clean = false;
      continue;
    }
    links.push({ barcode: value.barcode, foodId: value.foodId, linkedAt: value.linkedAt });
  }
  return { links, clean };
}

export function createAsyncStorageFoodBarcodeLinkRepository({
  storage = AsyncStorage,
  queue = localDataWriteQueue,
  foodExists,
}: {
  storage?: KeyValueStorage;
  queue?: SerialQueue;
  foodExists: (foodId: string) => Promise<boolean>;
}): FoodBarcodeLinkRepository {
  return {
    getLinkedFoodId: async (barcode) => {
      const { links } = parseFoodBarcodeLinks(await storage.getItem(FOOD_BARCODE_LINKS_STORAGE_KEY));
      const link = links.find((candidate) => candidate.barcode === barcode);
      return link && (await foodExists(link.foodId)) ? link.foodId : null;
    },

    linkIfUnlinked: (barcode, foodId, nowMs) =>
      queue.run(async () => {
        const raw = await storage.getItem(FOOD_BARCODE_LINKS_STORAGE_KEY);
        const { links, clean } = parseFoodBarcodeLinks(raw);
        const existing = links.find((link) => link.barcode === barcode);
        if (existing && (await foodExists(existing.foodId))) {
          return 'already_linked';
        }
        if (!clean && raw !== null && (await storage.getItem(FOOD_BARCODE_LINKS_BACKUP_STORAGE_KEY)) === null) {
          await storage.setItem(FOOD_BARCODE_LINKS_BACKUP_STORAGE_KEY, raw);
        }
        const next = [...links.filter((link) => link.barcode !== barcode), { barcode, foodId, linkedAt: new Date(nowMs).toISOString() }];
        await storage.setItem(FOOD_BARCODE_LINKS_STORAGE_KEY, JSON.stringify({ version: FOOD_BARCODE_LINKS_STORAGE_VERSION, links: next }));
        return 'linked';
      }),
  };
}
