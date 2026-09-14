import type { ReminderSettings, ReminderSettingsLoadResult } from '@/features/reminders/types';

export type ReminderRepositoryErrorCode = 'read_failed' | 'write_failed' | 'unsupported_version';

export class ReminderRepositoryError extends Error {
  readonly code: ReminderRepositoryErrorCode;

  constructor(code: ReminderRepositoryErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ReminderRepositoryError';
    this.code = code;
  }
}

export type ReminderRepository = {
  load(): Promise<ReminderSettingsLoadResult>;
  save(settings: ReminderSettings): Promise<void>;
};
