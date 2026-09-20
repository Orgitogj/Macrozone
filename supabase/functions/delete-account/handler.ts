export type VerifiedUser = { id: string; email: string | null };

export type RateLimitDecision = { allowed: boolean; retryAfterSeconds: number };

export type RateLimiter = { check(key: string): RateLimitDecision };

export type DeleteAccountDeps = {
  verifyAccessToken(accessToken: string): Promise<VerifiedUser | null>;
  verifyPassword(input: { email: string; password: string }): Promise<VerifiedUser | null>;
  deleteAccountData(userId: string): Promise<{ status: 'deleted' | 'already_deleted' }>;
  revokeChallengeSession?(): Promise<void>;
  rateLimiter?: RateLimiter;
  log?(entry: { event: string; outcome: string }): void;
};

export const MAX_PASSWORD_LENGTH = 72;

export const MAX_BODY_BYTES = 4096;

export function createMemoryRateLimiter({
  limit = 5,
  windowMs = 15 * 60_000,
  now = () => Date.now(),
}: { limit?: number; windowMs?: number; now?: () => number } = {}): RateLimiter {
  const attempts = new Map<string, number[]>();
  return {
    check: (key) => {
      const current = now();
      const recent = (attempts.get(key) ?? []).filter((stamp) => current - stamp < windowMs);
      if (recent.length >= limit) {
        const oldest = recent[0];
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (current - oldest)) / 1000)) };
      }
      recent.push(current);
      attempts.set(key, recent);
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

function respond(
  status: number,
  body: Record<string, unknown>,
  deps: DeleteAccountDeps,
  outcome: string,
  headers: Record<string, string> = {},
): Response {
  deps.log?.({ event: 'delete_account', outcome });
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (header === null) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim() ?? '';
  return token.length === 0 ? null : token;
}

async function readPassword(request: Request): Promise<string | null> {
  let parsed: unknown;
  try {
    const body = await request.text();
    if (body.length > MAX_BODY_BYTES) {
      return null;
    }
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const password = (parsed as { password?: unknown }).password;
  if (typeof password !== 'string' || password.length === 0 || password.length > MAX_PASSWORD_LENGTH) {
    return null;
  }
  return password;
}

export async function handleDeleteAccount(request: Request, deps: DeleteAccountDeps): Promise<Response> {
  if (request.method !== 'POST') {
    return respond(405, { error: 'method_not_allowed' }, deps, 'method_not_allowed');
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType !== '' && !contentType.toLowerCase().includes('application/json')) {
    return respond(415, { error: 'unsupported_media_type' }, deps, 'unsupported_media_type');
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return respond(413, { error: 'payload_too_large' }, deps, 'payload_too_large');
  }

  const accessToken = bearerToken(request);
  if (accessToken === null) {
    return respond(401, { error: 'not_authenticated' }, deps, 'missing_token');
  }

  const password = await readPassword(request);
  if (password === null) {
    return respond(400, { error: 'reauthentication_required' }, deps, 'missing_password');
  }

  let caller: VerifiedUser | null;
  try {
    caller = await deps.verifyAccessToken(accessToken);
  } catch {
    return respond(503, { error: 'service_unavailable' }, deps, 'token_check_failed');
  }
  if (caller === null) {
    return respond(401, { error: 'not_authenticated' }, deps, 'invalid_token');
  }
  if (caller.email === null || caller.email.length === 0) {
    return respond(400, { error: 'unsupported_account' }, deps, 'no_email');
  }

  const decision = deps.rateLimiter?.check(caller.id);
  if (decision !== undefined && !decision.allowed) {
    return respond(429, { error: 'rate_limited' }, deps, 'rate_limited', {
      'retry-after': String(decision.retryAfterSeconds),
    });
  }

  let reauthenticated: VerifiedUser | null;
  try {
    reauthenticated = await deps.verifyPassword({ email: caller.email, password });
  } catch {
    return respond(503, { error: 'service_unavailable' }, deps, 'password_check_failed');
  }
  if (reauthenticated === null) {
    return respond(401, { error: 'reauthentication_failed' }, deps, 'wrong_password');
  }
  if (reauthenticated.id !== caller.id) {
    return respond(403, { error: 'identity_mismatch' }, deps, 'identity_mismatch');
  }

  let result: { status: 'deleted' | 'already_deleted' };
  try {
    result = await deps.deleteAccountData(caller.id);
  } catch {
    return respond(503, { error: 'service_unavailable' }, deps, 'deletion_failed');
  }

  if (deps.revokeChallengeSession !== undefined) {
    try {
      await deps.revokeChallengeSession();
    } catch {
      return respond(200, { status: result.status }, deps, `${result.status}_session_not_revoked`);
    }
  }

  return respond(200, { status: result.status }, deps, result.status);
}
