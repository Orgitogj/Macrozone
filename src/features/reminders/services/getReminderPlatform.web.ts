import type { ReminderPlatform } from '@/features/reminders/services/notificationPlatform';

const platform: ReminderPlatform = { supported: false };

export function getReminderPlatform(): ReminderPlatform {
  return platform;
}
