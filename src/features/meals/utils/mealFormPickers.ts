import {
  compareDateKeys,
  dateKeyToLocalDate,
  formatLongDate,
  getEndOfLocalDay,
  getRelativeDayLabel,
  toLocalDateKey,
  type LocalDateKey,
} from '@/utils/date';
import {
  applyLocalTime,
  formatTimeLabel,
  localTimeFromDate,
  type LocalTime,
} from '@/utils/time';

export function getDatePickerValue(dateKey: LocalDateKey): Date {
  return dateKeyToLocalDate(dateKey);
}

export function getDatePickerMaximum(todayKey: LocalDateKey): Date {
  return getEndOfLocalDay(todayKey);
}

export function dateKeyFromPicker(selected: Date, todayKey: LocalDateKey): LocalDateKey {
  const selectedKey = toLocalDateKey(selected);
  return compareDateKeys(selectedKey, todayKey) > 0 ? todayKey : selectedKey;
}

export function getTimePickerValue(
  time: LocalTime | null,
  dateKey: LocalDateKey,
  now: Date,
): Date {
  return applyLocalTime(dateKeyToLocalDate(dateKey), time ?? localTimeFromDate(now));
}

export function timeFromPicker(selected: Date): LocalTime {
  return localTimeFromDate(selected);
}

export function formatMealDateLabel(dateKey: LocalDateKey, todayKey: LocalDateKey): string {
  const longDate = formatLongDate(dateKey, todayKey);
  const relative = getRelativeDayLabel(dateKey, todayKey);
  return relative ? `${relative}, ${longDate}` : longDate;
}

export function formatMealTimeLabel(time: LocalTime | null): string {
  return time === null ? 'No time set' : formatTimeLabel(time);
}
