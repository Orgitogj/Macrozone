export type AuthUser = {
  id: string;
  email: string | null;
  emailVerified: boolean;
};

export type AuthSession = {
  user: AuthUser;
  expiresAtMs: number | null;
};

export type AuthErrorCode =
  | 'not_configured'
  | 'offline'
  | 'service_unavailable'
  | 'invalid_credentials'
  | 'email_not_verified'
  | 'invalid_email'
  | 'weak_password'
  | 'same_password'
  | 'signup_disabled'
  | 'account_disabled'
  | 'rate_limited'
  | 'session_expired'
  | 'link_expired'
  | 'link_invalid'
  | 'reauthentication_required'
  | 'storage_failed'
  | 'cancelled'
  | 'unexpected';

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AuthError';
    this.code = code;
  }
}

export type SignUpOutcome = { status: 'verification_sent' } | { status: 'signed_in'; session: AuthSession };

export type AuthStateEvent = 'signed_in' | 'signed_out' | 'token_refreshed' | 'user_updated' | 'password_recovery';

export type AuthRepository = {
  isConfigured(): boolean;
  getSession(): Promise<AuthSession | null>;
  getAccessToken(): Promise<string | null>;
  subscribe(listener: (event: AuthStateEvent, session: AuthSession | null) => void): () => void;
  signUp(input: { email: string; password: string; redirectTo: string }): Promise<SignUpOutcome>;
  signIn(input: { email: string; password: string }): Promise<AuthSession>;
  signOut(): Promise<void>;
  requestPasswordReset(input: { email: string; redirectTo: string }): Promise<void>;
  exchangeCodeForSession(code: string): Promise<AuthSession>;
  updatePassword(password: string): Promise<void>;
  resendVerification(input: { email: string; redirectTo: string }): Promise<void>;
  startAutoRefresh(): void;
  stopAutoRefresh(): void;
};

export const AUTH_MESSAGES: Readonly<Record<AuthErrorCode, string>> = {
  not_configured: 'Cloud backup is not set up in this version of MacroZone. Everything still works on this device.',
  offline: 'You appear to be offline. Check your connection and try again.',
  service_unavailable: 'MacroZone accounts are unavailable right now. Please try again later.',
  invalid_credentials: 'That email or password is not correct.',
  email_not_verified: 'Confirm your email address first. Check your inbox for the confirmation link.',
  invalid_email: 'Enter a valid email address.',
  weak_password: 'Choose a longer password, at least 8 characters.',
  same_password: 'Choose a password you have not used here before.',
  signup_disabled: 'New accounts are not being created right now.',
  account_disabled: 'This account is not available. Contact support if you think this is wrong.',
  rate_limited: 'Too many attempts. Wait a few minutes and try again.',
  session_expired: 'Your session has expired. Sign in again to keep syncing.',
  link_expired: 'That link has expired. Request a new one.',
  link_invalid: 'That link is not valid. Request a new one on this device.',
  reauthentication_required: 'Enter your password again to confirm this change.',
  storage_failed: 'MacroZone could not store your session securely on this device.',
  cancelled: 'That request was cancelled.',
  unexpected: 'Something went wrong. Please try again.',
};
