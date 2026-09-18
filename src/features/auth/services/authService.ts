import {
  AUTH_MESSAGES,
  AuthError,
  type AuthRepository,
  type AuthSession,
  type AuthErrorCode,
} from '@/features/auth/types';
import { parseAuthLink, AUTH_CALLBACK_PATH, AUTH_RESET_PATH } from '@/features/auth/utils/authLinks';
import {
  validateEmailOnly,
  validateNewPassword,
  validateSignIn,
  validateSignUp,
  type CredentialErrors,
} from '@/features/auth/validation/credentials';

export type AuthActionResult<T = undefined> =
  | ({ status: 'ok' } & (T extends undefined ? { value?: undefined } : { value: T }))
  | { status: 'invalid'; errors: CredentialErrors }
  | { status: 'failed'; code: AuthErrorCode; message: string };

export type AuthLinkOutcome =
  | { status: 'ignored' }
  | { status: 'signed_in'; session: AuthSession; requiresNewPassword: boolean }
  | { status: 'failed'; code: AuthErrorCode; message: string };

function failure(error: unknown): { status: 'failed'; code: AuthErrorCode; message: string } {
  const mapped = error instanceof AuthError ? error : new AuthError('unexpected', AUTH_MESSAGES.unexpected, { cause: error });
  return { status: 'failed', code: mapped.code, message: mapped.message };
}

export function createAuthService({
  repository,
  redirectUrlFor,
  allowedOrigins,
}: {
  repository: AuthRepository;
  redirectUrlFor: (path: string) => string;
  allowedOrigins: () => readonly string[];
}) {
  return {
    isConfigured: () => repository.isConfigured(),

    getSession: async (): Promise<AuthSession | null> => {
      try {
        return await repository.getSession();
      } catch {
        return null;
      }
    },

    getAccessToken: async (): Promise<string | null> => {
      try {
        return await repository.getAccessToken();
      } catch {
        return null;
      }
    },

    subscribe: repository.subscribe,

    signUp: async (input: { email: string; password: string; confirmPassword: string }): Promise<AuthActionResult<AuthSession | null>> => {
      const validation = validateSignUp(input);
      if (!validation.ok) {
        return { status: 'invalid', errors: validation.errors };
      }
      try {
        const outcome = await repository.signUp({
          email: validation.email,
          password: validation.password,
          redirectTo: redirectUrlFor(AUTH_CALLBACK_PATH),
        });
        return { status: 'ok', value: outcome.status === 'signed_in' ? outcome.session : null };
      } catch (error) {
        if (error instanceof AuthError && (error.code === 'invalid_credentials' || error.code === 'rate_limited')) {
          return { status: 'ok', value: null };
        }
        return failure(error);
      }
    },

    signIn: async (input: { email: string; password: string }): Promise<AuthActionResult<AuthSession>> => {
      const validation = validateSignIn(input);
      if (!validation.ok) {
        return { status: 'invalid', errors: validation.errors };
      }
      try {
        const session = await repository.signIn({ email: validation.email, password: validation.password });
        return { status: 'ok', value: session };
      } catch (error) {
        return failure(error);
      }
    },

    signOut: async (): Promise<AuthActionResult> => {
      try {
        await repository.signOut();
        return { status: 'ok' };
      } catch (error) {
        return failure(error);
      }
    },

    requestPasswordReset: async (input: { email: string }): Promise<AuthActionResult> => {
      const validation = validateEmailOnly(input.email);
      if (!validation.ok) {
        return { status: 'invalid', errors: validation.errors };
      }
      try {
        await repository.requestPasswordReset({ email: validation.email, redirectTo: redirectUrlFor(AUTH_RESET_PATH) });
      } catch (error) {
        if (!(error instanceof AuthError) || error.code === 'unexpected') {
          return failure(error);
        }
        if (error.code !== 'rate_limited' && error.code !== 'offline' && error.code !== 'service_unavailable') {
          return { status: 'ok' };
        }
        return failure(error);
      }
      return { status: 'ok' };
    },

    resendVerification: async (input: { email: string }): Promise<AuthActionResult> => {
      const validation = validateEmailOnly(input.email);
      if (!validation.ok) {
        return { status: 'invalid', errors: validation.errors };
      }
      try {
        await repository.resendVerification({ email: validation.email, redirectTo: redirectUrlFor(AUTH_CALLBACK_PATH) });
        return { status: 'ok' };
      } catch (error) {
        return failure(error);
      }
    },

    updatePassword: async (input: { password: string; confirmPassword: string }): Promise<AuthActionResult> => {
      const validation = validateNewPassword(input);
      if (!validation.ok) {
        return { status: 'invalid', errors: validation.errors };
      }
      try {
        await repository.updatePassword(validation.password);
        return { status: 'ok' };
      } catch (error) {
        return failure(error);
      }
    },

    handleAuthLink: async (url: string): Promise<AuthLinkOutcome> => {
      const parsed = parseAuthLink(url, { allowedOrigins: allowedOrigins() });
      if (parsed.kind === 'ignored') {
        return { status: 'ignored' };
      }
      if (parsed.kind === 'error') {
        const code: AuthErrorCode = parsed.errorCode === 'otp_expired' ? 'link_expired' : 'link_invalid';
        return { status: 'failed', code, message: AUTH_MESSAGES[code] };
      }
      try {
        const session = await repository.exchangeCodeForSession(parsed.code);
        return { status: 'signed_in', session, requiresNewPassword: parsed.path === AUTH_RESET_PATH };
      } catch (error) {
        return failure(error);
      }
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
