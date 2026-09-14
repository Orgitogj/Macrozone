import { createAsyncStorageReminderRepository } from '@/features/reminders/repositories/asyncStorageReminderRepository';
import { getReminderPlatform } from '@/features/reminders/services/getReminderPlatform';
import { createReminderService, type ReminderService } from '@/features/reminders/services/reminderService';

let service: ReminderService | null | undefined;

export function getReminderService(): ReminderService | null {
  if (service === undefined) {
    const platform = getReminderPlatform();
    service = platform.supported
      ? createReminderService({
          repository: createAsyncStorageReminderRepository(),
          scheduler: platform.scheduler,
          permissions: platform.permissions,
          getTimeZone: platform.getTimeZone,
        })
      : null;
  }
  return service;
}
