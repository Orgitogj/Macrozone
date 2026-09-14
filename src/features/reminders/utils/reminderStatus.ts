import type { ReminderStatus } from '@/features/reminders/types';

export type ReminderStatusTone = 'secondary' | 'success' | 'warning' | 'danger';

export function describeReminderStatus(
  status: ReminderStatus,
  timeLabel: string,
  isPending: boolean,
): { text: string; tone: ReminderStatusTone } {
  if (isPending) {
    return { text: 'Updating…', tone: 'secondary' };
  }
  switch (status.kind) {
    case 'off':
      return { text: 'Off', tone: 'secondary' };
    case 'active':
      return { text: `On, every day at ${timeLabel}`, tone: 'success' };
    case 'needs_permission':
      return { text: 'On, but notifications are not allowed', tone: 'warning' };
    case 'not_scheduled':
      return { text: 'On, but not scheduled yet', tone: 'danger' };
  }
}
