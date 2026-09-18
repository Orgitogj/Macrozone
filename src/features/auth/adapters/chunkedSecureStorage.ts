import { fnv1aChecksum } from '@/utils/checksum';
import { createSerialQueue, type SerialQueue } from '@/utils/serialQueue';

export type SecureKeyValueStore = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

export type SessionStorageAdapter = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export class SessionStorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SessionStorageError';
  }
}

export const SECURE_CHUNK_BYTES = 1500;

type Manifest = { generation: number; count: number; checksum: string; length: number };

function utf8Length(codePoint: number): number {
  if (codePoint < 0x80) {
    return 1;
  }
  if (codePoint < 0x800) {
    return 2;
  }
  return codePoint < 0x10000 ? 3 : 4;
}

export function splitIntoChunks(value: string, maxBytes = SECURE_CHUNK_BYTES): string[] {
  const chunks: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const character of value) {
    const size = utf8Length(character.codePointAt(0) ?? 0);
    if (currentBytes + size > maxBytes && current !== '') {
      chunks.push(current);
      current = '';
      currentBytes = 0;
    }
    current += character;
    currentBytes += size;
  }
  if (current !== '') {
    chunks.push(current);
  }
  return chunks.length === 0 ? [''] : chunks;
}

function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

function parseManifest(raw: string | null): Manifest | null {
  if (raw === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const { generation, count, checksum, length } = parsed as Record<string, unknown>;
    if (
      typeof generation !== 'number' ||
      !Number.isInteger(generation) ||
      typeof count !== 'number' ||
      !Number.isInteger(count) ||
      count < 1 ||
      typeof checksum !== 'string' ||
      typeof length !== 'number'
    ) {
      return null;
    }
    return { generation, count, checksum, length };
  } catch {
    return null;
  }
}

export function createChunkedSecureStorage({
  store,
  prefix = 'macrozone.session',
  maxBytes = SECURE_CHUNK_BYTES,
  queue = createSerialQueue(),
}: {
  store: SecureKeyValueStore;
  prefix?: string;
  maxBytes?: number;
  queue?: SerialQueue;
}): SessionStorageAdapter {
  const base = (key: string) => `${safeKey(prefix)}.${safeKey(key)}`;
  const manifestKey = (key: string) => `${base(key)}.manifest`;
  const pendingKey = (key: string) => `${base(key)}.pending`;
  const chunkKey = (key: string, generation: number, index: number) => `${base(key)}.g${generation}.${index}`;

  const removeGeneration = async (key: string, generation: number, count: number): Promise<void> => {
    for (let index = 0; index < count; index += 1) {
      await store.deleteItemAsync(chunkKey(key, generation, index)).catch(() => undefined);
    }
  };

  const cleanupPending = async (key: string, activeGeneration: number | null): Promise<void> => {
    const pending = parseManifest(await store.getItemAsync(pendingKey(key)).catch(() => null));
    if (pending === null) {
      return;
    }
    if (activeGeneration === null || pending.generation !== activeGeneration) {
      await removeGeneration(key, pending.generation, pending.count);
    }
    await store.deleteItemAsync(pendingKey(key)).catch(() => undefined);
  };

  const readSession = async (key: string): Promise<string | null> => {
    let manifest: Manifest | null;
    try {
      manifest = parseManifest(await store.getItemAsync(manifestKey(key)));
    } catch (error) {
      throw new SessionStorageError('Could not read the saved session from secure storage.', { cause: error });
    }
    await cleanupPending(key, manifest?.generation ?? null);
    if (manifest === null) {
      return null;
    }
    const parts: string[] = [];
    for (let index = 0; index < manifest.count; index += 1) {
      const part = await store.getItemAsync(chunkKey(key, manifest.generation, index));
      if (part === null) {
        return null;
      }
      parts.push(part);
    }
    const value = parts.join('');
    if (value.length !== manifest.length || fnv1aChecksum(value) !== manifest.checksum) {
      return null;
    }
    return value;
  };

  const writeSession = async (key: string, value: string): Promise<void> => {
    const previous = parseManifest(await store.getItemAsync(manifestKey(key)).catch(() => null));
    await cleanupPending(key, previous?.generation ?? null);
    const generation = (previous?.generation ?? 0) + 1;
    const chunks = splitIntoChunks(value, maxBytes);
    const manifest: Manifest = {
      generation,
      count: chunks.length,
      checksum: fnv1aChecksum(value),
      length: value.length,
    };
    try {
      await store.setItemAsync(pendingKey(key), JSON.stringify({ ...manifest, checksum: '', length: 0 }));
      for (const [index, chunk] of chunks.entries()) {
        await store.setItemAsync(chunkKey(key, generation, index), chunk);
      }
      await store.setItemAsync(manifestKey(key), JSON.stringify(manifest));
    } catch (error) {
      await removeGeneration(key, generation, chunks.length);
      await store.deleteItemAsync(pendingKey(key)).catch(() => undefined);
      throw new SessionStorageError('Could not save the session to secure storage on this device.', { cause: error });
    }
    if (previous !== null) {
      await removeGeneration(key, previous.generation, previous.count);
    }
    await store.deleteItemAsync(pendingKey(key)).catch(() => undefined);
  };

  const clearSession = async (key: string): Promise<void> => {
    const manifest = parseManifest(await store.getItemAsync(manifestKey(key)).catch(() => null));
    await cleanupPending(key, manifest?.generation ?? null);
    if (manifest !== null) {
      await removeGeneration(key, manifest.generation, manifest.count);
    }
    await store.deleteItemAsync(manifestKey(key)).catch(() => undefined);
  };

  return {
    getItem: (key) => queue.run(() => readSession(key)),
    setItem: (key, value) => queue.run(() => writeSession(key, value)),
    removeItem: (key) => queue.run(() => clearSession(key)),
  };
}
