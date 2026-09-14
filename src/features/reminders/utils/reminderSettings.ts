import { MEAL_TYPES } from '@/features/meals/constants';
import type { MealType } from '@/features/meals/types';
import { isMealType } from '@/features/meals/utils/mealType';
import { DEFAULT_REMINDER_TIMES, REMINDER_SETTINGS_VERSION } from '@/features/reminders/constants';
import type {
  ReminderId,
  ReminderPreference,
  ReminderScheduleRecord,
  ReminderSettings,
} from '@/features/reminders/types';

export type ParsedReminderSettings =
  | { kind: 'valid'; settings: ReminderSettings }
  | { kind: 'recovered'; settings: ReminderSettings; problems: string[] }
  | { kind: 'unreadable'; settings: ReminderSettings }
  | { kind: 'unsupported_version'; version: number };

type StoredReminderSettings = {
  version: number;
  reminders: ReminderPreference[];
  schedules: ReminderScheduleRecord[];
};

export const REMINDER_IDS: readonly ReminderId[] = MEAL_TYPES.map(toReminderId);

export function toReminderId(mealType: MealType): ReminderId {
  return `reminder-${mealType}`;
}

export function isReminderId(value: unknown): value is ReminderId {
  return typeof value === 'string' && (REMINDER_IDS as readonly string[]).includes(value);
}

export function isValidReminderHour(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23;
}

export function isValidReminderMinute(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 59;
}

export function isValidReminderTime(hour: unknown, minute: unknown): boolean {
  return isValidReminderHour(hour) && isValidReminderMinute(minute);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

export function createDefaultReminder(mealType: MealType): ReminderPreference {
  const { hour, minute } = DEFAULT_REMINDER_TIMES[mealType];
  return { id: toReminderId(mealType), mealType, enabled: false, hour, minute, updatedAt: null };
}

export function createDefaultReminderSettings(): ReminderSettings {
  return { reminders: MEAL_TYPES.map(createDefaultReminder), schedules: [] };
}

function parseReminder(value: unknown): ReminderPreference | null {
  if (!isRecord(value)) {
    return null;
  }
  const { id, mealType, enabled, hour, minute, updatedAt } = value;
  if (
    !isMealType(mealType) ||
    id !== toReminderId(mealType) ||
    typeof enabled !== 'boolean' ||
    !isValidReminderHour(hour) ||
    !isValidReminderMinute(minute) ||
    !(updatedAt === null || isIsoTimestamp(updatedAt))
  ) {
    return null;
  }
  return { id: toReminderId(mealType), mealType, enabled, hour, minute, updatedAt };
}

function parseSchedule(value: unknown): ReminderScheduleRecord | null {
  if (!isRecord(value)) {
    return null;
  }
  const { reminderId, notificationId, hour, minute, timeZone, scheduledAt } = value;
  if (
    !isReminderId(reminderId) ||
    typeof notificationId !== 'string' ||
    notificationId.length === 0 ||
    !isValidReminderHour(hour) ||
    !isValidReminderMinute(minute) ||
    !(timeZone === null || (typeof timeZone === 'string' && timeZone.length > 0)) ||
    !isIsoTimestamp(scheduledAt)
  ) {
    return null;
  }
  return { reminderId, notificationId, hour, minute, timeZone, scheduledAt };
}

export function parseStoredReminderSettings(json: string): ParsedReminderSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { kind: 'unreadable', settings: createDefaultReminderSettings() };
  }
  if (!isRecord(parsed) || typeof parsed.version !== 'number' || !Number.isInteger(parsed.version)) {
    return { kind: 'unreadable', settings: createDefaultReminderSettings() };
  }
  if (parsed.version > REMINDER_SETTINGS_VERSION) {
    return { kind: 'unsupported_version', version: parsed.version };
  }
  if (parsed.version !== REMINDER_SETTINGS_VERSION || !Array.isArray(parsed.reminders)) {
    return { kind: 'unreadable', settings: createDefaultReminderSettings() };
  }

  const problems: string[] = [];
  const reminders = new Map<ReminderId, ReminderPreference>();
  const duplicateIds = new Set<ReminderId>();

  parsed.reminders.forEach((entry, index) => {
    const reminder = parseReminder(entry);
    if (!reminder) {
      problems.push(`Reminder entry ${index} is invalid.`);
      return;
    }
    if (reminders.has(reminder.id)) {
      duplicateIds.add(reminder.id);
      return;
    }
    reminders.set(reminder.id, reminder);
  });

  duplicateIds.forEach((id) => {
    reminders.delete(id);
    problems.push(`Reminder ${id} appears more than once.`);
  });

  const schedules = new Map<ReminderId, ReminderScheduleRecord>();
  const duplicateSchedules = new Set<ReminderId>();
  const rawSchedules = parsed.schedules === undefined ? [] : parsed.schedules;
  if (!Array.isArray(rawSchedules)) {
    problems.push('Reminder schedules are invalid.');
  } else {
    rawSchedules.forEach((entry, index) => {
      const schedule = parseSchedule(entry);
      if (!schedule) {
        problems.push(`Schedule entry ${index} is invalid.`);
        return;
      }
      if (schedules.has(schedule.reminderId)) {
        duplicateSchedules.add(schedule.reminderId);
        return;
      }
      schedules.set(schedule.reminderId, schedule);
    });
  }

  duplicateSchedules.forEach((id) => {
    schedules.delete(id);
    problems.push(`Schedule for ${id} appears more than once.`);
  });

  const settings: ReminderSettings = {
    reminders: MEAL_TYPES.map((mealType) => {
      const id = toReminderId(mealType);
      const reminder = reminders.get(id);
      if (!reminder) {
        if (!duplicateIds.has(id)) {
          problems.push(`Reminder for ${mealType} is missing.`);
        }
        return createDefaultReminder(mealType);
      }
      return reminder;
    }),
    schedules: REMINDER_IDS.flatMap((id) => {
      const schedule = schedules.get(id);
      return schedule ? [schedule] : [];
    }),
  };

  const uniqueProblems = [...new Set(problems)];
  return uniqueProblems.length === 0
    ? { kind: 'valid', settings }
    : { kind: 'recovered', settings, problems: uniqueProblems };
}

export function serializeReminderSettings(settings: ReminderSettings): string {
  const stored: StoredReminderSettings = {
    version: REMINDER_SETTINGS_VERSION,
    reminders: settings.reminders,
    schedules: settings.schedules,
  };
  return JSON.stringify(stored);
}

export function getReminder(settings: ReminderSettings, id: ReminderId): ReminderPreference {
  const reminder = settings.reminders.find((candidate) => candidate.id === id);
  if (!reminder) {
    throw new Error(`Unknown reminder ${id}.`);
  }
  return reminder;
}

export function getScheduleRecord(settings: ReminderSettings, id: ReminderId): ReminderScheduleRecord | null {
  return settings.schedules.find((schedule) => schedule.reminderId === id) ?? null;
}

export function updateReminder(
  settings: ReminderSettings,
  id: ReminderId,
  changes: Partial<Pick<ReminderPreference, 'enabled' | 'hour' | 'minute'>>,
  timestamp: string,
): ReminderSettings {
  return {
    ...settings,
    reminders: settings.reminders.map((reminder) =>
      reminder.id === id ? { ...reminder, ...changes, updatedAt: timestamp } : reminder,
    ),
  };
}

export function setScheduleRecord(
  settings: ReminderSettings,
  id: ReminderId,
  record: ReminderScheduleRecord | null,
): ReminderSettings {
  const others = settings.schedules.filter((schedule) => schedule.reminderId !== id);
  return {
    ...settings,
    schedules: REMINDER_IDS.flatMap((reminderId) => {
      if (reminderId === id) {
        return record ? [record] : [];
      }
      return others.filter((schedule) => schedule.reminderId === reminderId);
    }),
  };
}
