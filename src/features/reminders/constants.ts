import type { MealType } from '@/features/meals/types';

export const REMINDER_SETTINGS_STORAGE_KEY = 'meal_reminders';

export const REMINDER_SETTINGS_BACKUP_STORAGE_KEY = 'meal_reminders_unreadable_backup';

export const REMINDER_SETTINGS_VERSION = 1;

export const REMINDER_NOTIFICATION_KIND = 'macrozone.meal-reminder';

export const REMINDER_NOTIFICATION_VERSION = 1;

export const MEAL_REMINDER_CHANNEL = {
  id: 'meal-reminders',
  name: 'Meal reminders',
  description: 'Daily reminders to log your meals in MacroZone.',
} as const;

export const DEFAULT_REMINDER_TIMES: Readonly<Record<MealType, { hour: number; minute: number }>> = {
  breakfast: { hour: 8, minute: 0 },
  lunch: { hour: 12, minute: 30 },
  dinner: { hour: 19, minute: 0 },
  snack: { hour: 16, minute: 0 },
};

export const REMINDER_COPY: Readonly<Record<MealType, { label: string; title: string; body: string }>> = {
  breakfast: {
    label: 'Breakfast',
    title: 'Breakfast reminder',
    body: 'Log your breakfast in MacroZone to keep today on track.',
  },
  lunch: {
    label: 'Lunch',
    title: 'Lunch reminder',
    body: 'Log your lunch in MacroZone to keep today on track.',
  },
  dinner: {
    label: 'Dinner',
    title: 'Dinner reminder',
    body: 'Log your dinner in MacroZone to keep today on track.',
  },
  snack: {
    label: 'Snacks',
    title: 'Snack reminder',
    body: 'Had a snack? Log it in MacroZone to keep today on track.',
  },
};

export const REMINDER_MESSAGES = {
  loadFailed: 'Could not read your reminder settings on this device.',
  saveFailed: 'Could not save your reminder settings on this device.',
  unsupportedVersion:
    'These reminder settings were saved by a newer version of MacroZone. Update the app to change them.',
  unreadable:
    'Saved reminder settings could not be read, so defaults are shown. A copy of the unreadable settings is kept when you make a change.',
  recovered:
    'Some saved reminder settings could not be read and were reset to defaults. A copy of the original settings is kept when you make a change.',
  permissionCheckFailed: 'Could not check notification permission. Please try again.',
  permissionRequestFailed: 'Could not ask for notification permission. Please try again.',
  channelFailed: 'Could not prepare meal reminder notifications. Please try again.',
  scheduleFailed: 'Could not schedule this reminder. Please try again.',
  replaceFailed: 'Could not change the reminder time. Your previous reminder time is still active.',
  enableSaveFailed: 'Could not save this reminder, so it was not turned on. Please try again.',
  disableSaveFailed: 'Could not turn off this reminder. It is still on. Please try again.',
  disableCancelFailed:
    'The reminder is off, but its scheduled notification could not be removed yet. MacroZone will try again automatically.',
  replaceCleanupFailed:
    'The new time is saved, but the previous notification could not be removed yet. MacroZone will try again automatically.',
  cleanupPending: 'Some old reminder notifications could not be removed yet. MacroZone will try again automatically.',
  invalidTime: 'Choose a valid reminder time.',
  permissionDenied: 'Notifications are not allowed, so this reminder was not turned on.',
  reconcileFailed: 'Could not check your scheduled reminders. Please try again.',
  openSettingsFailed: 'Could not open system settings. Open Settings on your device and find MacroZone.',
} as const;
