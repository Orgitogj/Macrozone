import type {
  ReminderId,
  ReminderScheduleRecord,
  ReminderSettings,
  ReminderStatus,
} from '@/features/reminders/types';
import { isMacroZoneReminderData, parseReminderNotificationData } from '@/features/reminders/utils/reminderNotifications';
import { getScheduleRecord } from '@/features/reminders/utils/reminderSettings';

export type ScheduledNotificationSummary = {
  notificationId: string;
  data: unknown;
};

export type ReconciliationInput = {
  settings: ReminderSettings;
  scheduled: readonly ScheduledNotificationSummary[];
  permissionAllowed: boolean;
  timeZone: string | null;
};

export type ReminderReplacement = {
  reminderId: ReminderId;
  replaces: string[];
};

export type ReconciliationPlan = {
  keep: ReminderScheduleRecord[];
  schedule: ReminderReplacement[];
  cancel: string[];
};

function isRecordCurrent(record: ReminderScheduleRecord, hour: number, minute: number, timeZone: string | null): boolean {
  return (
    record.hour === hour &&
    record.minute === minute &&
    (timeZone === null || record.timeZone === null || record.timeZone === timeZone)
  );
}

export function planReminderReconciliation({
  settings,
  scheduled,
  permissionAllowed,
  timeZone,
}: ReconciliationInput): ReconciliationPlan {
  const owned = new Map<ReminderId, string[]>();
  const cancel: string[] = [];

  for (const notification of scheduled) {
    const data = parseReminderNotificationData(notification.data);
    if (data) {
      owned.set(data.reminderId, [...(owned.get(data.reminderId) ?? []), notification.notificationId]);
    } else if (isMacroZoneReminderData(notification.data)) {
      cancel.push(notification.notificationId);
    }
  }

  const keep: ReminderScheduleRecord[] = [];
  const schedule: ReminderReplacement[] = [];

  for (const reminder of settings.reminders) {
    const ownedIds = owned.get(reminder.id) ?? [];
    const record = getScheduleRecord(settings, reminder.id);
    const scheduledRecord = record !== null && ownedIds.includes(record.notificationId) ? record : null;

    if (!reminder.enabled) {
      cancel.push(...ownedIds);
      continue;
    }

    if (!permissionAllowed) {
      if (scheduledRecord) {
        keep.push(scheduledRecord);
        cancel.push(...ownedIds.filter((id) => id !== scheduledRecord.notificationId));
      }
      continue;
    }

    if (scheduledRecord && isRecordCurrent(scheduledRecord, reminder.hour, reminder.minute, timeZone)) {
      keep.push(scheduledRecord);
      cancel.push(...ownedIds.filter((id) => id !== scheduledRecord.notificationId));
      continue;
    }

    schedule.push({ reminderId: reminder.id, replaces: ownedIds });
  }

  return { keep, schedule, cancel: [...new Set(cancel)] };
}

export function isReconciliationNoop(plan: ReconciliationPlan, settings: ReminderSettings): boolean {
  return (
    plan.schedule.length === 0 &&
    plan.cancel.length === 0 &&
    plan.keep.length === settings.schedules.length &&
    plan.keep.every((record) => settings.schedules.includes(record))
  );
}

export function deriveReminderStatuses(
  settings: ReminderSettings,
  permissionAllowed: boolean,
): Record<ReminderId, ReminderStatus> {
  return Object.fromEntries(
    settings.reminders.map((reminder): [ReminderId, ReminderStatus] => {
      if (!reminder.enabled) {
        return [reminder.id, { kind: 'off' }];
      }
      if (!permissionAllowed) {
        return [reminder.id, { kind: 'needs_permission' }];
      }
      return [reminder.id, getScheduleRecord(settings, reminder.id) ? { kind: 'active' } : { kind: 'not_scheduled' }];
    }),
  ) as Record<ReminderId, ReminderStatus>;
}
