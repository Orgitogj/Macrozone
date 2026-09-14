import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  REMINDER_MESSAGES,
  REMINDER_SETTINGS_BACKUP_STORAGE_KEY,
  REMINDER_SETTINGS_STORAGE_KEY,
} from '@/features/reminders/constants';
import { ReminderRepositoryError, type ReminderRepository } from '@/features/reminders/repositories/reminderRepository';
import type { ReminderSettingsLoadResult } from '@/features/reminders/types';
import {
  createDefaultReminderSettings,
  parseStoredReminderSettings,
  serializeReminderSettings,
} from '@/features/reminders/utils/reminderSettings';
import { createSerialQueue, type SerialQueue } from '@/utils/serialQueue';

type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export function createAsyncStorageReminderRepository({
  storage = AsyncStorage,
  queue = createSerialQueue(),
}: { storage?: KeyValueStorage; queue?: SerialQueue } = {}): ReminderRepository {
  const readRaw = async (key: string): Promise<string | null> => {
    try {
      return await storage.getItem(key);
    } catch (error) {
      throw new ReminderRepositoryError('read_failed', REMINDER_MESSAGES.loadFailed, { cause: error });
    }
  };

  const load = async (): Promise<ReminderSettingsLoadResult> => {
    const raw = await readRaw(REMINDER_SETTINGS_STORAGE_KEY);
    if (raw === null) {
      return { settings: createDefaultReminderSettings(), stored: false, issue: null };
    }
    const parsed = parseStoredReminderSettings(raw);
    switch (parsed.kind) {
      case 'valid':
        return { settings: parsed.settings, stored: true, issue: null };
      case 'recovered':
        return { settings: parsed.settings, stored: true, issue: 'recovered' };
      case 'unreadable':
        return { settings: parsed.settings, stored: true, issue: 'unreadable' };
      case 'unsupported_version':
        return { settings: createDefaultReminderSettings(), stored: true, issue: 'unsupported_version' };
    }
  };

  return {
    load: () => queue.run(load),

    save: (settings) =>
      queue.run(async () => {
        const raw = await readRaw(REMINDER_SETTINGS_STORAGE_KEY);
        if (raw !== null) {
          const current = parseStoredReminderSettings(raw);
          if (current.kind === 'unsupported_version') {
            throw new ReminderRepositoryError('unsupported_version', REMINDER_MESSAGES.unsupportedVersion);
          }
          if (current.kind !== 'valid') {
            const existingBackup = await readRaw(REMINDER_SETTINGS_BACKUP_STORAGE_KEY);
            if (existingBackup === null) {
              try {
                await storage.setItem(REMINDER_SETTINGS_BACKUP_STORAGE_KEY, raw);
              } catch (error) {
                throw new ReminderRepositoryError('write_failed', REMINDER_MESSAGES.saveFailed, { cause: error });
              }
            }
          }
        }
        try {
          await storage.setItem(REMINDER_SETTINGS_STORAGE_KEY, serializeReminderSettings(settings));
        } catch (error) {
          throw new ReminderRepositoryError('write_failed', REMINDER_MESSAGES.saveFailed, { cause: error });
        }
      }),
  };
}
