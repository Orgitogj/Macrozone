import { AuthError, AUTH_MESSAGES, type AuthRepository } from '@/features/auth/types';

function unavailable(): never {
  throw new AuthError('not_configured', AUTH_MESSAGES.not_configured);
}

export function createNotConfiguredAuthRepository(): AuthRepository {
  return {
    isConfigured: () => false,
    getSession: () => Promise.resolve(null),
    getAccessToken: () => Promise.resolve(null),
    subscribe: () => () => undefined,
    signUp: () => unavailable(),
    signIn: () => unavailable(),
    signOut: () => Promise.resolve(),
    requestPasswordReset: () => unavailable(),
    exchangeCodeForSession: () => unavailable(),
    updatePassword: () => unavailable(),
    resendVerification: () => unavailable(),
    startAutoRefresh: () => undefined,
    stopAutoRefresh: () => undefined,
  };
}
