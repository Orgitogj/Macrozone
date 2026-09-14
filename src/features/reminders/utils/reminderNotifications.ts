import { isMealType } from '@/features/meals/utils/mealType';
import {
  REMINDER_COPY,
  REMINDER_NOTIFICATION_KIND,
  REMINDER_NOTIFICATION_VERSION,
} from '@/features/reminders/constants';
import type {
  ReminderNotificationContent,
  ReminderNotificationData,
  ReminderPreference,
} from '@/features/reminders/types';
import {
  isValidReminderHour,
  isValidReminderMinute,
  isValidReminderTime,
  toReminderId,
} from '@/features/reminders/utils/reminderSettings';
import { formatTimeLabel, toLocalTime } from '@/utils/time';

export function formatReminderTime(hour: number, minute: number): string {
  return isValidReminderTime(hour, minute) ? formatTimeLabel(toLocalTime(hour, minute)) : 'Invalid time';
}

export function reminderTimeToDate(hour: number, minute: number, reference: Date): Date {
  const date = new Date(reference.getTime());
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function reminderTimeFromDate(date: Date): { hour: number; minute: number } {
  return { hour: date.getHours(), minute: date.getMinutes() };
}

export function buildReminderNotificationContent(reminder: ReminderPreference): ReminderNotificationContent {
  if (!isValidReminderTime(reminder.hour, reminder.minute)) {
    throw new Error('Reminder time is invalid.');
  }
  const copy = REMINDER_COPY[reminder.mealType];
  const title = copy.title.trim();
  const body = copy.body.trim();
  if (title.length === 0 || body.length === 0) {
    throw new Error('Reminder notification text is empty.');
  }
  return {
    title,
    body,
    hour: reminder.hour,
    minute: reminder.minute,
    data: {
      kind: REMINDER_NOTIFICATION_KIND,
      version: REMINDER_NOTIFICATION_VERSION,
      reminderId: reminder.id,
      mealType: reminder.mealType,
      hour: reminder.hour,
      minute: reminder.minute,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseReminderNotificationData(value: unknown): ReminderNotificationData | null {
  if (!isRecord(value)) {
    return null;
  }
  const { kind, version, reminderId, mealType, hour, minute } = value;
  if (
    kind !== REMINDER_NOTIFICATION_KIND ||
    version !== REMINDER_NOTIFICATION_VERSION ||
    !isMealType(mealType) ||
    reminderId !== toReminderId(mealType) ||
    !isValidReminderHour(hour) ||
    !isValidReminderMinute(minute)
  ) {
    return null;
  }
  return {
    kind: REMINDER_NOTIFICATION_KIND,
    version: REMINDER_NOTIFICATION_VERSION,
    reminderId: toReminderId(mealType),
    mealType,
    hour,
    minute,
  };
}

export function isMacroZoneReminderData(value: unknown): boolean {
  return isRecord(value) && value.kind === REMINDER_NOTIFICATION_KIND;
}
