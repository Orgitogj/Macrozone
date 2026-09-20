export type ErrorContext = Record<string, string | number | boolean | null>;

export type ErrorReport = {
  scope: string;
  name: string;
  message: string;
  context: ErrorContext;
};

export type ErrorSink = (report: ErrorReport) => void;

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const TOKEN_PATTERN = /\b(?:ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}|sb_[A-Za-z0-9_-]{12,}|sk-[A-Za-z0-9_-]{12,})\b/g;
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

export function redact(value: string): string {
  return value
    .replace(EMAIL_PATTERN, '[email]')
    .replace(TOKEN_PATTERN, '[token]')
    .replace(UUID_PATTERN, '[id]')
    .slice(0, 300);
}

let sink: ErrorSink | null = null;

export function setErrorSink(next: ErrorSink | null): void {
  sink = next;
}

export function describeError(scope: string, error: unknown, context: ErrorContext = {}): ErrorReport {
  const source = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');
  return {
    scope,
    name: source.name,
    message: redact(source.message),
    context,
  };
}

export function reportError(scope: string, error: unknown, context: ErrorContext = {}): void {
  const report = describeError(scope, error, context);
  if (__DEV__) {
    console.warn(`[${report.scope}] ${report.name}: ${report.message}`, report.context);
  }
  sink?.(report);
}
