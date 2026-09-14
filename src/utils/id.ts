import { randomUUID } from 'expo-crypto';

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class IdGenerationError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('Could not generate a unique identifier.', options);
    this.name = 'IdGenerationError';
  }
}

export function isUuidV4(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4_PATTERN.test(value);
}

export function createId(generate: () => unknown = randomUUID): string {
  let candidate: unknown;
  try {
    candidate = generate();
  } catch (error) {
    throw new IdGenerationError({ cause: error });
  }
  if (!isUuidV4(candidate)) {
    throw new IdGenerationError();
  }
  return candidate.toLowerCase();
}
