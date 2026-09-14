declare const localTimeBrand: unique symbol;

export type LocalTime = string & { readonly [localTimeBrand]: true };

const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function isLocalTime(value: unknown): value is LocalTime {
  return typeof value === 'string' && LOCAL_TIME_PATTERN.test(value);
}

export function toLocalTime(hours: number, minutes: number): LocalTime {
  return `${pad(hours)}:${pad(minutes)}` as LocalTime;
}

export function localTimeFromDate(date: Date): LocalTime {
  return toLocalTime(date.getHours(), date.getMinutes());
}

export function applyLocalTime(reference: Date, time: LocalTime): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(reference.getTime());
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function localTimeToMinutes(time: LocalTime): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function getLocalMinutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function formatTimeLabel(time: LocalTime): string {
  const [hours, minutes] = time.split(':').map(Number);
  const displayHours = ((hours + 11) % 12) + 1;
  return `${displayHours}:${pad(minutes)} ${hours < 12 ? 'AM' : 'PM'}`;
}
