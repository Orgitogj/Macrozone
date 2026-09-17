import AsyncStorage from '@react-native-async-storage/async-storage';

import { AI_PREFERENCES_STORAGE_KEY } from '@/features/ai-meal/constants';
import { createId, isUuidV4 } from '@/utils/id';
import { createSerialQueue, type SerialQueue } from '@/utils/serialQueue';

type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export type AiPreferences = {
  rateLimitKey: string | null;
  photoDisclosure: { version: number; acknowledgedAt: string } | null;
};

export type AiPreferencesRepository = {
  getRateLimitKey(): Promise<string>;
  getAcknowledgedPhotoDisclosureVersion(): Promise<number | null>;
  acknowledgePhotoDisclosure(version: number): Promise<void>;
};

const STORED_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseAiPreferences(raw: string | null): AiPreferences {
  const empty: AiPreferences = { rateLimitKey: null, photoDisclosure: null };
  if (raw === null) {
    return empty;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (!isRecord(parsed) || parsed.version !== STORED_VERSION) {
    return empty;
  }
  const disclosure = parsed.photoDisclosure;
  return {
    rateLimitKey: isUuidV4(parsed.rateLimitKey) ? parsed.rateLimitKey.toLowerCase() : null,
    photoDisclosure:
      isRecord(disclosure) &&
      typeof disclosure.version === 'number' &&
      Number.isInteger(disclosure.version) &&
      disclosure.version > 0 &&
      typeof disclosure.acknowledgedAt === 'string' &&
      !Number.isNaN(Date.parse(disclosure.acknowledgedAt))
        ? { version: disclosure.version, acknowledgedAt: disclosure.acknowledgedAt }
        : null,
  };
}

export function createAsyncStorageAiPreferencesRepository({
  storage = AsyncStorage,
  queue = createSerialQueue(),
  generateId = createId,
  now = () => new Date(),
}: {
  storage?: KeyValueStorage;
  queue?: SerialQueue;
  generateId?: () => string;
  now?: () => Date;
} = {}): AiPreferencesRepository {
  const read = async () => parseAiPreferences(await storage.getItem(AI_PREFERENCES_STORAGE_KEY));

  const write = (preferences: AiPreferences) =>
    storage.setItem(AI_PREFERENCES_STORAGE_KEY, JSON.stringify({ version: STORED_VERSION, ...preferences }));

  return {
    getRateLimitKey: () =>
      queue.run(async () => {
        const preferences = await read();
        if (preferences.rateLimitKey !== null) {
          return preferences.rateLimitKey;
        }
        const rateLimitKey = generateId();
        await write({ ...preferences, rateLimitKey });
        return rateLimitKey;
      }),

    getAcknowledgedPhotoDisclosureVersion: async () => (await read()).photoDisclosure?.version ?? null,

    acknowledgePhotoDisclosure: (version) =>
      queue.run(async () => {
        const preferences = await read();
        await write({ ...preferences, photoDisclosure: { version, acknowledgedAt: now().toISOString() } });
      }),
  };
}
