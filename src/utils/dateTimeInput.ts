import {
  compareDateKeys,
  dateKeyToLocalDate,
  isLocalDateKey,
  toLocalDateKey,
} from '@/utils/date';
import { applyLocalTime, isLocalTime, localTimeFromDate } from '@/utils/time';

export type DateTimeInputMode = 'date' | 'time';

export function toDateTimeInputValue(
  mode: DateTimeInputMode,
  value: Date,
  isEmpty: boolean,
): string {
  if (isEmpty) {
    return '';
  }
  return mode === 'date' ? toLocalDateKey(value) : localTimeFromDate(value);
}

export function toDateInputMaximum(maximumDate: Date | undefined): string | undefined {
  return maximumDate === undefined ? undefined : toLocalDateKey(maximumDate);
}

export function parseDateTimeInputValue(
  mode: DateTimeInputMode,
  text: string,
  { reference, maximumDate }: { reference: Date; maximumDate?: Date },
): Date | null {
  if (mode === 'time') {
    return isLocalTime(text) ? applyLocalTime(reference, text) : null;
  }
  if (!isLocalDateKey(text)) {
    return null;
  }
  if (maximumDate !== undefined && compareDateKeys(text, toLocalDateKey(maximumDate)) > 0) {
    return null;
  }
  return dateKeyToLocalDate(text);
}

export function clampDateToMaximum(value: Date, maximumDate: Date | undefined): Date {
  return maximumDate !== undefined && value.getTime() > maximumDate.getTime()
    ? new Date(maximumDate.getTime())
    : value;
}
