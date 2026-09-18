export const AUTH_CALLBACK_PATH = 'auth/callback';

export const AUTH_RESET_PATH = 'auth/reset-password';

const ALLOWED_PATHS = new Set([AUTH_CALLBACK_PATH, AUTH_RESET_PATH]);

const ALLOWED_NEXT_ROUTES = new Set(['/account', '/(tabs)', '/(tabs)/index']);

export type AuthLinkResult =
  | { kind: 'ignored' }
  | { kind: 'code'; path: string; code: string; next: string | null }
  | { kind: 'error'; path: string; errorCode: string };

function normalizePath(pathname: string): string {
  return pathname.replace(/^\/+/, '').replace(/\/+$/, '');
}

function routeOf(url: URL): string {
  const isWeb = url.protocol === 'http:' || url.protocol === 'https:';
  const raw = isWeb ? url.pathname : `${url.host}${url.pathname}`;
  const marker = raw.lastIndexOf('--/');
  return normalizePath(marker < 0 ? raw : raw.slice(marker + 3));
}

function originOf(url: URL): string {
  return url.protocol === 'http:' || url.protocol === 'https:' ? `${url.protocol}//${url.host}` : url.protocol;
}

function readParams(url: URL): URLSearchParams {
  const params = new URLSearchParams(url.search);
  const fragment = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  if (fragment.length > 0) {
    for (const [key, value] of new URLSearchParams(fragment)) {
      if (!params.has(key)) {
        params.set(key, value);
      }
    }
  }
  return params;
}

export function parseAuthLink(rawUrl: string, { allowedOrigins }: { allowedOrigins: readonly string[] }): AuthLinkResult {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { kind: 'ignored' };
  }
  const origin = originOf(url);
  const matchesOrigin = allowedOrigins.some((allowed) =>
    allowed.endsWith(':') ? url.protocol === allowed : origin === allowed.replace(/\/$/, ''),
  );
  if (!matchesOrigin) {
    return { kind: 'ignored' };
  }
  const path = routeOf(url);
  if (!ALLOWED_PATHS.has(path)) {
    return { kind: 'ignored' };
  }
  const params = readParams(url);
  const errorCode = params.get('error_code') ?? params.get('error');
  if (errorCode !== null) {
    return { kind: 'error', path, errorCode };
  }
  const code = params.get('code');
  if (code === null || !/^[A-Za-z0-9._~-]{16,256}$/.test(code)) {
    return { kind: 'ignored' };
  }
  const next = params.get('next');
  return { kind: 'code', path, code, next: next !== null && ALLOWED_NEXT_ROUTES.has(next) ? next : null };
}

export function isSafeReturnRoute(route: string | null | undefined): boolean {
  return typeof route === 'string' && ALLOWED_NEXT_ROUTES.has(route);
}
