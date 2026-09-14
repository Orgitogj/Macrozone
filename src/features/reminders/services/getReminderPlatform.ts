import {
  createExpoNotificationPermissionService,
  createExpoNotificationResponseSource,
  createExpoNotificationScheduler,
} from '@/features/reminders/services/expoNotificationPlatform';
import type { ReminderPlatform } from '@/features/reminders/services/notificationPlatform';
import { getDeviceTimeZone } from '@/utils/timeZone';

const platform: ReminderPlatform = {
  supported: true,
  scheduler: createExpoNotificationScheduler(),
  permissions: createExpoNotificationPermissionService(),
  responses: createExpoNotificationResponseSource(),
  getTimeZone: getDeviceTimeZone,
};

export function getReminderPlatform(): ReminderPlatform {
  return platform;
}
