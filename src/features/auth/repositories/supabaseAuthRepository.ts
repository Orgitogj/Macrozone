import { AuthError, type AuthRepository, type AuthSession, type AuthStateEvent, type AuthUser, AUTH_MESSAGES } from '@/features/auth/types';

type SupabaseUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  identities?: unknown[] | null;
};

type SupabaseSession = {
  expires_at?: number | null;
  access_token?: string | null;
  user: SupabaseUser;
};

type SupabaseAuthError = { message: string; code?: string | null; status?: number | null; name?: string };

type Result<T> = { data: T; error: SupabaseAuthError | null };

export type SupabaseAuthClient = {
  auth: {
    getSession(): Promise<Result<{ session: SupabaseSession | null }>>;
    onAuthStateChange(
      callback: (event: string, session: SupabaseSession | null) => void,
    ): { data: { subscription: { unsubscribe(): void } } };
    signUp(credentials: {
      email: string;
      password: string;
      options?: { emailRedirectTo?: string };
    }): Promise<Result<{ user: SupabaseUser | null; session: SupabaseSession | null }>>;
    signInWithPassword(credentials: {
      email: string;
      password: string;
    }): Promise<Result<{ user: SupabaseUser | null; session: SupabaseSession | null }>>;
    signOut(options?: { scope?: 'global' | 'local' | 'others' }): Promise<{ error: SupabaseAuthError | null }>;
    resetPasswordForEmail(email: string, options?: { redirectTo?: string }): Promise<Result<unknown>>;
    exchangeCodeForSession(code: string): Promise<Result<{ session: SupabaseSession | null }>>;
    updateUser(attributes: { password?: string }): Promise<Result<{ user: SupabaseUser | null }>>;
    resend(options: { type: 'signup'; email: string; options?: { emailRedirectTo?: string } }): Promise<Result<unknown>>;
    startAutoRefresh(): Promise<void>;
    stopAutoRefresh(): Promise<void>;
  };
};

const CODE_MAP: Readonly<Record<string, AuthError['code']>> = {
  invalid_credentials: 'invalid_credentials',
  email_not_confirmed: 'email_not_verified',
  email_address_invalid: 'invalid_email',
  validation_failed: 'invalid_email',
  weak_password: 'weak_password',
  same_password: 'same_password',
  signup_disabled: 'signup_disabled',
  email_provider_disabled: 'signup_disabled',
  user_banned: 'account_disabled',
  user_not_found: 'invalid_credentials',
  session_not_found: 'session_expired',
  session_expired: 'session_expired',
  refresh_token_not_found: 'session_expired',
  refresh_token_already_used: 'session_expired',
  bad_jwt: 'session_expired',
  otp_expired: 'link_expired',
  flow_state_expired: 'link_expired',
  flow_state_not_found: 'link_invalid',
  bad_code_verifier: 'link_invalid',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
  request_timeout: 'service_unavailable',
  reauthentication_needed: 'reauthentication_required',
  reauthentication_not_valid: 'reauthentication_required',
};

export function mapAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) {
    return error;
  }
  const candidate = error as SupabaseAuthError | undefined;
  const code = typeof candidate?.code === 'string' ? CODE_MAP[candidate.code] : undefined;
  if (code) {
    return new AuthError(code, AUTH_MESSAGES[code], { cause: error });
  }
  const status = typeof candidate?.status === 'number' ? candidate.status : null;
  if (candidate?.name === 'AuthRetryableFetchError' || status === 0 || status === null) {
    const message = typeof candidate?.message === 'string' ? candidate.message.toLowerCase() : '';
    if (message.includes('network') || message.includes('fetch') || candidate?.name === 'AuthRetryableFetchError') {
      return new AuthError('offline', AUTH_MESSAGES.offline, { cause: error });
    }
  }
  if (status === 429) {
    return new AuthError('rate_limited', AUTH_MESSAGES.rate_limited, { cause: error });
  }
  if (status !== null && status >= 500) {
    return new AuthError('service_unavailable', AUTH_MESSAGES.service_unavailable, { cause: error });
  }
  if (status === 401 || status === 403) {
    return new AuthError('invalid_credentials', AUTH_MESSAGES.invalid_credentials, { cause: error });
  }
  return new AuthError('unexpected', AUTH_MESSAGES.unexpected, { cause: error });
}

function toUser(user: SupabaseUser): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    emailVerified: Boolean(user.email_confirmed_at ?? user.confirmed_at),
  };
}

function toSession(session: SupabaseSession | null): AuthSession | null {
  if (session === null) {
    return null;
  }
  return {
    user: toUser(session.user),
    expiresAtMs: typeof session.expires_at === 'number' ? session.expires_at * 1000 : null,
  };
}

function eventOf(event: string): AuthStateEvent | null {
  switch (event) {
    case 'SIGNED_IN':
    case 'INITIAL_SESSION':
      return 'signed_in';
    case 'SIGNED_OUT':
      return 'signed_out';
    case 'TOKEN_REFRESHED':
      return 'token_refreshed';
    case 'USER_UPDATED':
      return 'user_updated';
    case 'PASSWORD_RECOVERY':
      return 'password_recovery';
    default:
      return null;
  }
}

function unwrap<T>(result: Result<T>): T {
  if (result.error !== null) {
    throw mapAuthError(result.error);
  }
  return result.data;
}

export function createSupabaseAuthRepository(client: SupabaseAuthClient): AuthRepository {
  const call = async <T>(run: () => Promise<Result<T>>): Promise<T> => {
    try {
      return unwrap(await run());
    } catch (error) {
      throw mapAuthError(error);
    }
  };

  return {
    isConfigured: () => true,

    getSession: async () => {
      const data = await call(() => client.auth.getSession());
      return toSession(data.session);
    },

    getAccessToken: async () => {
      const data = await call(() => client.auth.getSession());
      const token = data.session?.access_token;
      return typeof token === 'string' && token.length > 0 ? token : null;
    },

    subscribe: (listener) => {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        const mapped = eventOf(event);
        if (mapped !== null) {
          listener(mapped, toSession(session));
        }
      });
      return () => data.subscription.unsubscribe();
    },

    signUp: async ({ email, password, redirectTo }) => {
      const data = await call(() => client.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } }));
      const session = toSession(data.session);
      return session === null ? { status: 'verification_sent' } : { status: 'signed_in', session };
    },

    signIn: async ({ email, password }) => {
      const data = await call(() => client.auth.signInWithPassword({ email, password }));
      const session = toSession(data.session);
      if (session === null) {
        throw new AuthError('invalid_credentials', AUTH_MESSAGES.invalid_credentials);
      }
      return session;
    },

    signOut: async () => {
      const result = await client.auth.signOut({ scope: 'local' });
      if (result.error !== null) {
        const mapped = mapAuthError(result.error);
        if (mapped.code !== 'session_expired' && mapped.code !== 'offline') {
          throw mapped;
        }
      }
    },

    requestPasswordReset: async ({ email, redirectTo }) => {
      await call(() => client.auth.resetPasswordForEmail(email, { redirectTo }));
    },

    exchangeCodeForSession: async (code) => {
      const data = await call(() => client.auth.exchangeCodeForSession(code));
      const session = toSession(data.session);
      if (session === null) {
        throw new AuthError('link_invalid', AUTH_MESSAGES.link_invalid);
      }
      return session;
    },

    updatePassword: async (password) => {
      await call(() => client.auth.updateUser({ password }));
    },

    resendVerification: async ({ email, redirectTo }) => {
      await call(() => client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo } }));
    },

    startAutoRefresh: () => {
      void client.auth.startAutoRefresh().catch(() => undefined);
    },

    stopAutoRefresh: () => {
      void client.auth.stopAutoRefresh().catch(() => undefined);
    },
  };
}
