export const PASSWORD_LIMITS = {
  minLength: 8,
  maxLength: 72,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function normalizeEmail(email: string): string {
  return email.trim().replace(/\s+/g, '').toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length <= 254 && EMAIL_PATTERN.test(normalized);
}

export type CredentialErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
};

export type CredentialValidation =
  | { ok: true; email: string; password: string }
  | { ok: false; errors: CredentialErrors };

export function validateSignIn({ email, password }: { email: string; password: string }): CredentialValidation {
  const errors: CredentialErrors = {};
  if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (password.length === 0) {
    errors.password = 'Enter your password.';
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, email: normalizeEmail(email), password };
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_LIMITS.minLength) {
    return `Use at least ${PASSWORD_LIMITS.minLength} characters.`;
  }
  if (password.length > PASSWORD_LIMITS.maxLength) {
    return `Use at most ${PASSWORD_LIMITS.maxLength} characters.`;
  }
  return null;
}

export function validateSignUp({
  email,
  password,
  confirmPassword,
}: {
  email: string;
  password: string;
  confirmPassword: string;
}): CredentialValidation {
  const errors: CredentialErrors = {};
  if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address.';
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    errors.password = passwordError;
  }
  if (confirmPassword !== password) {
    errors.confirmPassword = 'The passwords do not match.';
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, email: normalizeEmail(email), password };
}

export function validateEmailOnly(email: string): { ok: true; email: string } | { ok: false; errors: CredentialErrors } {
  return isValidEmail(email) ? { ok: true, email: normalizeEmail(email) } : { ok: false, errors: { email: 'Enter a valid email address.' } };
}

export function validateNewPassword({
  password,
  confirmPassword,
}: {
  password: string;
  confirmPassword: string;
}): { ok: true; password: string } | { ok: false; errors: CredentialErrors } {
  const errors: CredentialErrors = {};
  const passwordError = validatePassword(password);
  if (passwordError) {
    errors.password = passwordError;
  }
  if (confirmPassword !== password) {
    errors.confirmPassword = 'The passwords do not match.';
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, password };
}
