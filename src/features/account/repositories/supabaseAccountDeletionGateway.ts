export type AccountDeletionOutcome = { status: 'deleted' | 'already_deleted' };

export type AccountDeletionErrorCode =
  | 'not_configured'
  | 'not_authenticated'
  | 'reauthentication_failed'
  | 'identity_mismatch'
  | 'unsupported_account'
  | 'offline'
  | 'rate_limited'
  | 'service_unavailable'
  | 'unexpected';

export class AccountDeletionError extends Error {
  readonly code: AccountDeletionErrorCode;

  constructor(code: AccountDeletionErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AccountDeletionError';
    this.code = code;
  }
}

export const ACCOUNT_DELETION_MESSAGES: Readonly<Record<AccountDeletionErrorCode, string>> = {
  not_configured: 'Cloud backup is not set up in this version of MacroZone, so there is no cloud account to delete.',
  not_authenticated: 'Your session has expired. Sign in again and retry the deletion.',
  reauthentication_failed: 'That password is not correct. Nothing was deleted.',
  identity_mismatch: 'Those credentials belong to a different account. Nothing was deleted.',
  unsupported_account: 'This account cannot be deleted from the app. Contact support.',
  offline: 'You appear to be offline. Nothing was deleted. Try again when you are connected.',
  rate_limited: 'Too many attempts. Wait a few minutes and try again.',
  service_unavailable: 'The account service is unavailable right now. Nothing was deleted.',
  unexpected: 'MacroZone could not complete the deletion. Nothing was deleted.',
};

export type AccountDeletionGateway = {
  deleteAccount(input: { password: string; signal?: AbortSignal }): Promise<AccountDeletionOutcome>;
};

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

const ERROR_CODES: Readonly<Record<string, AccountDeletionErrorCode>> = {
  not_authenticated: 'not_authenticated',
  reauthentication_required: 'reauthentication_failed',
  reauthentication_failed: 'reauthentication_failed',
  identity_mismatch: 'identity_mismatch',
  unsupported_account: 'unsupported_account',
  service_unavailable: 'service_unavailable',
};

function codeFor(status: number, body: unknown): AccountDeletionErrorCode {
  const error = typeof body === 'object' && body !== null ? (body as { error?: unknown }).error : null;
  if (typeof error === 'string' && ERROR_CODES[error] !== undefined) {
    return ERROR_CODES[error];
  }
  if (status === 401) {
    return 'not_authenticated';
  }
  if (status === 403) {
    return 'identity_mismatch';
  }
  if (status === 429) {
    return 'rate_limited';
  }
  return status >= 500 ? 'service_unavailable' : 'unexpected';
}

export function createSupabaseAccountDeletionGateway({
  functionsUrl,
  publishableKey,
  getAccessToken,
  fetchImpl = (input, init) => fetch(input, init),
}: {
  functionsUrl: string;
  publishableKey: string;
  getAccessToken: () => Promise<string | null>;
  fetchImpl?: FetchLike;
}): AccountDeletionGateway {
  return {
    deleteAccount: async ({ password, signal }) => {
      const accessToken = await getAccessToken();
      if (accessToken === null) {
        throw new AccountDeletionError('not_authenticated', ACCOUNT_DELETION_MESSAGES.not_authenticated);
      }
      let response: Response;
      try {
        response = await fetchImpl(`${functionsUrl}/delete-account`, {
          method: 'POST',
          headers: {
            apikey: publishableKey,
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ password }),
          signal,
        });
      } catch (error) {
        throw new AccountDeletionError('offline', ACCOUNT_DELETION_MESSAGES.offline, { cause: error });
      }
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      if (!response.ok) {
        const code = codeFor(response.status, body);
        throw new AccountDeletionError(code, ACCOUNT_DELETION_MESSAGES[code]);
      }
      const status = typeof body === 'object' && body !== null ? (body as { status?: unknown }).status : null;
      if (status !== 'deleted' && status !== 'already_deleted') {
        throw new AccountDeletionError('unexpected', ACCOUNT_DELETION_MESSAGES.unexpected);
      }
      return { status };
    },
  };
}
