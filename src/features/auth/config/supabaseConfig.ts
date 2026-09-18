export type SupabaseConfig =
  | { status: 'ready'; url: string; publishableKey: string }
  | { status: 'not_configured'; reason: 'missing' | 'invalid_url' | 'invalid_key' | 'secret_key' };

const PLACEHOLDER_HOSTS = /(^|\.)(example\.(com|org|net)|localhost|invalid|test)$/i;

const SECRET_KEY_PREFIXES = ['sb_secret_', 'service_role', 'sbp_'];

function isSecretKey(key: string): boolean {
  const lowered = key.toLowerCase();
  if (SECRET_KEY_PREFIXES.some((prefix) => lowered.startsWith(prefix))) {
    return true;
  }
  const segments = key.split('.');
  if (segments.length !== 3) {
    return false;
  }
  try {
    const payload = globalThis.atob ? globalThis.atob(segments[1].replace(/-/g, '+').replace(/_/g, '/')) : '';
    return payload.includes('"service_role"');
  } catch {
    return false;
  }
}

export function resolveSupabaseConfig({
  url,
  publishableKey,
  allowInsecureHosts = false,
}: {
  url: string | undefined;
  publishableKey: string | undefined;
  allowInsecureHosts?: boolean;
}): SupabaseConfig {
  const trimmedUrl = url?.trim() ?? '';
  const trimmedKey = publishableKey?.trim() ?? '';
  if (trimmedUrl === '' || trimmedKey === '') {
    return { status: 'not_configured', reason: 'missing' };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmedUrl);
  } catch {
    return { status: 'not_configured', reason: 'invalid_url' };
  }
  if (parsed.protocol !== 'https:') {
    return { status: 'not_configured', reason: 'invalid_url' };
  }
  if (!allowInsecureHosts && PLACEHOLDER_HOSTS.test(parsed.hostname)) {
    return { status: 'not_configured', reason: 'invalid_url' };
  }
  if (isSecretKey(trimmedKey)) {
    return { status: 'not_configured', reason: 'secret_key' };
  }
  if (trimmedKey.length < 20) {
    return { status: 'not_configured', reason: 'invalid_key' };
  }
  return { status: 'ready', url: parsed.origin, publishableKey: trimmedKey };
}

export function describeSupabaseConfig(config: SupabaseConfig): string | null {
  if (config.status === 'ready') {
    return null;
  }
  switch (config.reason) {
    case 'secret_key':
      return 'Cloud backup is not configured. The configured key is not a publishable key.';
    default:
      return 'Cloud backup is not configured. MacroZone works on this device without an account.';
  }
}
