import { REMINDER_COPY } from '@/features/reminders/constants';
import type { ReminderId, ReminderOverview } from '@/features/reminders/types';
import { formatReminderTime, reminderTimeToDate } from '@/features/reminders/utils/reminderNotifications';
import { describeReminderStatus, type ReminderStatusTone } from '@/features/reminders/utils/reminderStatus';

export type ReminderProblem = {
  message: string;
  retry: (() => void) | null;
};

export type ReminderCardModel = {
  id: ReminderId;
  label: string;
  enabled: boolean;
  timeLabel: string;
  timeValue: Date;
  statusText: string;
  statusTone: ReminderStatusTone;
  problem: ReminderProblem | null;
  isPending: boolean;
};

export function buildReminderCardModels(
  overview: ReminderOverview,
  problems: Partial<Record<ReminderId, ReminderProblem>>,
  pendingId: ReminderId | null,
  reference: Date,
): ReminderCardModel[] {
  return overview.settings.reminders.map((reminder) => {
    const timeLabel = formatReminderTime(reminder.hour, reminder.minute);
    const isPending = pendingId === reminder.id;
    const status = describeReminderStatus(overview.statuses[reminder.id], timeLabel, isPending);
    return {
      id: reminder.id,
      label: REMINDER_COPY[reminder.mealType].label,
      enabled: reminder.enabled,
      timeLabel,
      timeValue: reminderTimeToDate(reminder.hour, reminder.minute, reference),
      statusText: status.text,
      statusTone: status.tone,
      problem: problems[reminder.id] ?? null,
      isPending,
    };
  });
}
