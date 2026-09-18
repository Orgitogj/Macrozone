export type VerifiedUser = { id: string; email: string | null };

export type DeleteAccountDeps = {
  verifyAccessToken(accessToken: string): Promise<VerifiedUser | null>;
  verifyPassword(input: { email: string; password: string }): Promise<VerifiedUser | null>;
  deleteAccountData(userId: string): Promise<{ status: 'deleted' | 'already_deleted' }>;
  revokeChallengeSession?(): Promise<void>;
  log?(entry: { event: string; outcome: string }): void;
};

export const MAX_PASSWORD_LENGTH = 72;

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

function respond(status: number, body: Record<string, unknown>, deps: DeleteAccountDeps, outcome: string): Response {
  deps.log?.({ event: 'delete_account', outcome });
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
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
    parsed = await request.json();
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
