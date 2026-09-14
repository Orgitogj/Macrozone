import type { MealType } from '@/features/meals/types';

export type ReminderId = `reminder-${MealType}`;

export type ReminderPreference = {
  id: ReminderId;
  mealType: MealType;
  enabled: boolean;
  hour: number;
  minute: number;
  updatedAt: string | null;
};

export type ReminderScheduleRecord = {
  reminderId: ReminderId;
  notificationId: string;
  hour: number;
  minute: number;
  timeZone: string | null;
  scheduledAt: string;
};

export type ReminderSettings = {
  reminders: ReminderPreference[];
  schedules: ReminderScheduleRecord[];
};

export type ReminderStorageIssue = 'recovered' | 'unreadable' | 'unsupported_version';

export type ReminderSettingsLoadResult = {
  settings: ReminderSettings;
  stored: boolean;
  issue: ReminderStorageIssue | null;
};

export type NotificationPermissionStatus = 'granted' | 'provisional' | 'ephemeral' | 'denied' | 'undetermined';

export type NotificationPermissionSnapshot = {
  status: NotificationPermissionStatus;
  canAskAgain: boolean;
};

export type ReminderNotificationData = {
  kind: string;
  version: number;
  reminderId: ReminderId;
  mealType: MealType;
  hour: number;
  minute: number;
};

export type ReminderNotificationContent = {
  title: string;
  body: string;
  hour: number;
  minute: number;
  data: ReminderNotificationData;
};

export type ReminderStatus =
  | { kind: 'off' }
  | { kind: 'active' }
  | { kind: 'needs_permission' }
  | { kind: 'not_scheduled' };

export type ReminderOverview = {
  settings: ReminderSettings;
  storageIssue: ReminderStorageIssue | null;
  readOnly: boolean;
  permission: NotificationPermissionSnapshot | null;
  statuses: Record<ReminderId, ReminderStatus>;
  notice: string | null;
};

export type ReminderActionResult =
  | { outcome: 'success'; overview: ReminderOverview; warning: string | null }
  | { outcome: 'permission_denied'; overview: ReminderOverview }
  | { outcome: 'failed'; overview: ReminderOverview | null; message: string };
