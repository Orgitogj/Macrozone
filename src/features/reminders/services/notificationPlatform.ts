import type { NotificationPermissionSnapshot, ReminderNotificationContent } from '@/features/reminders/types';
import type { ScheduledNotificationSummary } from '@/features/reminders/utils/reminderReconciliation';
import type { ReminderNotificationResponse } from '@/features/reminders/utils/reminderResponses';

export type NotificationScheduler = {
  ensureReminderChannel(): Promise<void>;
  scheduleDailyReminder(content: ReminderNotificationContent): Promise<string>;
  cancelScheduledNotification(notificationId: string): Promise<void>;
  listScheduledNotifications(): Promise<ScheduledNotificationSummary[]>;
};

export type NotificationPermissionService = {
  getPermission(): Promise<NotificationPermissionSnapshot>;
  requestPermission(): Promise<NotificationPermissionSnapshot>;
  openSystemSettings(): Promise<boolean>;
};

export type NotificationResponseSource = {
  configureForegroundPresentation(): void;
  getLastResponse(): ReminderNotificationResponse | null;
  clearLastResponse(): void;
  subscribe(listener: (response: ReminderNotificationResponse) => void): () => void;
};

export type ReminderPlatform =
  | {
      supported: true;
      scheduler: NotificationScheduler;
      permissions: NotificationPermissionService;
      responses: NotificationResponseSource;
      getTimeZone: () => string | null;
    }
  | { supported: false };
