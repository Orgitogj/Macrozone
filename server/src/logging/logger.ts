export type LogFieldValue = string | number | boolean | null;

export type LogFields = Readonly<Record<string, LogFieldValue>>;

export type Logger = {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
};

const ALLOWED_FIELDS = new Set([
  'requestId',
  'method',
  'route',
  'status',
  'code',
  'detail',
  'inputKind',
  'imageBytes',
  'textLength',
  'itemCount',
  'attempts',
  'environment',
  'deployment',
  'usageStore',
  'maxConcurrentRequests',
  'dailyRequestBudget',
  'durationMs',
  'provider',
  'model',
  'port',
  'host',
  'variable',
]);

export function sanitizeLogFields(fields: LogFields = {}): LogFields {
  return Object.fromEntries(
    Object.entries(fields).filter(
      ([key, value]) => ALLOWED_FIELDS.has(key) && (typeof value !== 'string' || value.length <= 120),
    ),
  );
}

export function createJsonLogger(write: (line: string) => void, now: () => Date = () => new Date()): Logger {
  const log = (level: 'info' | 'warn' | 'error', event: string, fields?: LogFields) => {
    write(JSON.stringify({ time: now().toISOString(), level, event, ...sanitizeLogFields(fields) }));
  };
  return {
    info: (event, fields) => log('info', event, fields),
    warn: (event, fields) => log('warn', event, fields),
    error: (event, fields) => log('error', event, fields),
  };
}
