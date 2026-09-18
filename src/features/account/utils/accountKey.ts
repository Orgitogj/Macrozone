import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';

const ACCOUNT_KEY_LENGTH = 32;

export async function deriveAccountKey(
  userId: string,
  digest: (algorithm: CryptoDigestAlgorithm, data: string) => Promise<string> = digestStringAsync,
): Promise<string> {
  const trimmed = userId.trim();
  if (trimmed.length === 0) {
    throw new Error('An account key needs a user id.');
  }
  const hash = await digest(CryptoDigestAlgorithm.SHA256, `macrozone.account.${trimmed}`);
  return hash.toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, ACCOUNT_KEY_LENGTH);
}

export function accountDatabaseName(accountKey: string): string {
  if (!/^[0-9a-f]{8,64}$/.test(accountKey)) {
    throw new Error('Invalid account key.');
  }
  return `macrozone-account-${accountKey}.db`;
}

export function accountStoragePrefix(accountKey: string): string {
  if (!/^[0-9a-f]{8,64}$/.test(accountKey)) {
    throw new Error('Invalid account key.');
  }
  return `macrozone.account.${accountKey}.`;
}
