import { APP_LOCALE } from '@/utils/format';

declare const localDateKeyBrand: unique symbol;

export type LocalDateKey = string & { readonly [localDateKeyBrand]: true };

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

function createLocalNoon(year: number, monthIndex: number, day: number): Date {
  const date = new Date(2000, 0, 1, 12, 0, 0, 0);
  date.setFullYear(year, monthIndex, day);
  return date;
}

export function toLocalDateKey(date: Date): LocalDateKey {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}` as LocalDateKey;
}

export function getTodayDateKey(now: Date = new Date()): LocalDateKey {
  return toLocalDateKey(now);
}

export function isLocalDateKey(value: unknown): value is LocalDateKey {
  if (typeof value !== 'string') {
    return false;
  }
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = createLocalNoon(year, monthIndex, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === monthIndex &&
    date.getDate() === day
  );
}

export function dateKeyToLocalDate(key: LocalDateKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  return createLocalNoon(year, month - 1, day);
}

export function addDaysToDateKey(key: LocalDateKey, days: number): LocalDateKey {
  const date = dateKeyToLocalDate(key);
  date.setDate(date.getDate() + days);
  return toLocalDateKey(date);
}

export function compareDateKeys(a: LocalDateKey, b: LocalDateKey): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

export function resolveSelectedDateKey(
  requested: string | string[] | undefined,
  todayKey: LocalDateKey,
): LocalDateKey {
  const candidate = Array.isArray(requested) ? requested[0] : requested;
  if (!isLocalDateKey(candidate) || compareDateKeys(candidate, todayKey) > 0) {
    return todayKey;
  }
  return candidate;
}

export function getRelativeDayLabel(
  key: LocalDateKey,
  todayKey: LocalDateKey,
): string | null {
  if (key === todayKey) {
    return 'Today';
  }
  if (key === addDaysToDateKey(todayKey, -1)) {
    return 'Yesterday';
  }
  return null;
}

export function formatLongDate(
  key: LocalDateKey,
  referenceKey?: LocalDateKey,
): string {
  const includeYear =
    referenceKey === undefined || referenceKey.slice(0, 4) !== key.slice(0, 4);
  return dateKeyToLocalDate(key).toLocaleDateString(APP_LOCALE, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
  });
}

export function formatDayLabel(
  key: LocalDateKey,
  todayKey: LocalDateKey,
): string {
  return getRelativeDayLabel(key, todayKey) ?? formatLongDate(key, todayKey);
}
