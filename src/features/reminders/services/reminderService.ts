import { REMINDER_MESSAGES } from '@/features/reminders/constants';
import { ReminderRepositoryError, type ReminderRepository } from '@/features/reminders/repositories/reminderRepository';
import type {
  NotificationPermissionService,
  NotificationScheduler,
} from '@/features/reminders/services/notificationPlatform';
import type {
  NotificationPermissionSnapshot,
  ReminderActionResult,
  ReminderId,
  ReminderNotificationContent,
  ReminderOverview,
  ReminderScheduleRecord,
  ReminderSettings,
  ReminderSettingsLoadResult,
} from '@/features/reminders/types';
import { buildReminderNotificationContent } from '@/features/reminders/utils/reminderNotifications';
import {
  canRequestNotificationPermission,
  isNotificationPermissionAllowed,
} from '@/features/reminders/utils/reminderPermissions';
import {
  deriveReminderStatuses,
  isReconciliationNoop,
  planReminderReconciliation,
  type ScheduledNotificationSummary,
} from '@/features/reminders/utils/reminderReconciliation';
import {
  getReminder,
  getScheduleRecord,
  isValidReminderTime,
  REMINDER_IDS,
  setScheduleRecord,
  updateReminder,
} from '@/features/reminders/utils/reminderSettings';
import { createSerialQueue, type SerialQueue } from '@/utils/serialQueue';

export class ReminderServiceError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ReminderServiceError';
  }
}

export type ReminderService = {
  reconcile(): Promise<ReminderOverview>;
  reconcileIfConfigured(): Promise<ReminderOverview | null>;
  setReminderEnabled(id: ReminderId, enabled: boolean): Promise<ReminderActionResult>;
  changeReminderTime(id: ReminderId, hour: number, minute: number): Promise<ReminderActionResult>;
  openSystemSettings(): Promise<boolean>;
};

export type ReminderServiceDependencies = {
  repository: ReminderRepository;
  scheduler: NotificationScheduler;
  permissions: NotificationPermissionService;
  getTimeZone: () => string | null;
  now?: () => Date;
  queue?: SerialQueue;
  logError?: (message: string, error: unknown) => void;
};

function defaultLogError(message: string, error: unknown) {
  if (__DEV__) {
    console.warn(`[reminders] ${message}`, error);
  }
}

function sortRecords(records: ReminderScheduleRecord[]): ReminderScheduleRecord[] {
  return REMINDER_IDS.flatMap((id) => records.filter((record) => record.reminderId === id));
}

export function createReminderService({
  repository,
  scheduler,
  permissions,
  getTimeZone,
  now = () => new Date(),
  queue = createSerialQueue(),
  logError = defaultLogError,
}: ReminderServiceDependencies): ReminderService {
  const buildOverview = (
    loaded: ReminderSettingsLoadResult,
    settings: ReminderSettings,
    permission: NotificationPermissionSnapshot | null,
    notice: string | null = null,
  ): ReminderOverview => ({
    settings,
    storageIssue: loaded.issue,
    readOnly: loaded.issue === 'unsupported_version',
    permission,
    statuses: deriveReminderStatuses(settings, isNotificationPermissionAllowed(permission)),
    notice,
  });

  const loadSettings = async (): Promise<ReminderSettingsLoadResult> => {
    try {
      return await repository.load();
    } catch (error) {
      logError('Failed to load reminder settings', error);
      throw new ReminderServiceError(
        error instanceof ReminderRepositoryError ? error.message : REMINDER_MESSAGES.loadFailed,
        { cause: error },
      );
    }
  };

  const readPermission = async (): Promise<NotificationPermissionSnapshot | null> => {
    try {
      return await permissions.getPermission();
    } catch (error) {
      logError('Failed to read notification permission', error);
      return null;
    }
  };

  const saveSettings = async (settings: ReminderSettings): Promise<string | null> => {
    try {
      await repository.save(settings);
      return null;
    } catch (error) {
      logError('Failed to save reminder settings', error);
      return error instanceof ReminderRepositoryError && error.code === 'unsupported_version'
        ? REMINDER_MESSAGES.unsupportedVersion
        : REMINDER_MESSAGES.saveFailed;
    }
  };

  const cancelSafely = async (notificationId: string): Promise<boolean> => {
    try {
      await scheduler.cancelScheduledNotification(notificationId);
      return true;
    } catch (error) {
      logError('Failed to cancel a scheduled reminder', error);
      return false;
    }
  };

  const createRecord = (id: ReminderId, notificationId: string, hour: number, minute: number): ReminderScheduleRecord => ({
    reminderId: id,
    notificationId,
    hour,
    minute,
    timeZone: getTimeZone(),
    scheduledAt: now().toISOString(),
  });

  const failed = (message: string, overview: ReminderOverview | null): ReminderActionResult => ({
    outcome: 'failed',
    message,
    overview,
  });

  const reconcileLoaded = async (loaded: ReminderSettingsLoadResult): Promise<ReminderOverview> => {
    const permission = await readPermission();
    const settings = loaded.settings;
    if (loaded.issue === 'unsupported_version') {
      return buildOverview(loaded, settings, permission);
    }

    let scheduled: ScheduledNotificationSummary[];
    try {
      scheduled = await scheduler.listScheduledNotifications();
    } catch (error) {
      logError('Failed to read scheduled notifications', error);
      return buildOverview(loaded, settings, permission, REMINDER_MESSAGES.reconcileFailed);
    }

    const plan = planReminderReconciliation({
      settings,
      scheduled,
      permissionAllowed: isNotificationPermissionAllowed(permission),
      timeZone: getTimeZone(),
    });
    if (isReconciliationNoop(plan, settings)) {
      return buildOverview(loaded, settings, permission);
    }

    const notices = new Set<string>();
    const created: { record: ReminderScheduleRecord; replaces: string[] }[] = [];

    if (plan.schedule.length > 0) {
      let channelReady = true;
      try {
        await scheduler.ensureReminderChannel();
      } catch (error) {
        logError('Failed to prepare the reminder channel', error);
        notices.add(REMINDER_MESSAGES.channelFailed);
        channelReady = false;
      }
      if (channelReady) {
        for (const replacement of plan.schedule) {
          const reminder = getReminder(settings, replacement.reminderId);
          try {
            const notificationId = await scheduler.scheduleDailyReminder(buildReminderNotificationContent(reminder));
            created.push({
              record: createRecord(reminder.id, notificationId, reminder.hour, reminder.minute),
              replaces: replacement.replaces,
            });
          } catch (error) {
            logError('Failed to schedule a reminder during reconciliation', error);
            notices.add(REMINDER_MESSAGES.scheduleFailed);
          }
        }
      }
    }

    const nextSettings: ReminderSettings = {
      ...settings,
      schedules: sortRecords([...plan.keep, ...created.map((entry) => entry.record)]),
    };
    const recordsChanged =
      created.length > 0 ||
      plan.keep.length !== settings.schedules.length ||
      !plan.keep.every((record) => settings.schedules.includes(record));

    const saveError = recordsChanged ? await saveSettings(nextSettings) : null;
    if (saveError) {
      for (const entry of created) {
        await cancelSafely(entry.record.notificationId);
      }
      return buildOverview(loaded, { ...settings, schedules: sortRecords(plan.keep) }, permission, saveError);
    }

    const toCancel = [...plan.cancel, ...created.flatMap((entry) => entry.replaces)];
    for (const notificationId of new Set(toCancel)) {
      if (!(await cancelSafely(notificationId))) {
        notices.add(REMINDER_MESSAGES.cleanupPending);
      }
    }

    return buildOverview(
      { ...loaded, stored: loaded.stored || recordsChanged },
      nextSettings,
      permission,
      notices.size > 0 ? [...notices].join(' ') : null,
    );
  };

  const enableReminder = async (id: ReminderId): Promise<ReminderActionResult> => {
    const loaded = await loadSettings();
    const { settings } = loaded;
    if (loaded.issue === 'unsupported_version') {
      return failed(REMINDER_MESSAGES.unsupportedVersion, buildOverview(loaded, settings, null));
    }

    const reminder = getReminder(settings, id);
    let content: ReminderNotificationContent;
    try {
      content = buildReminderNotificationContent(reminder);
    } catch (error) {
      logError('Reminder is invalid', error);
      return failed(REMINDER_MESSAGES.invalidTime, buildOverview(loaded, settings, null));
    }

    let permission = await readPermission();
    if (permission === null) {
      return failed(REMINDER_MESSAGES.permissionCheckFailed, buildOverview(loaded, settings, null));
    }
    if (!isNotificationPermissionAllowed(permission) && !canRequestNotificationPermission(permission)) {
      return { outcome: 'permission_denied', overview: buildOverview(loaded, settings, permission) };
    }

    try {
      await scheduler.ensureReminderChannel();
    } catch (error) {
      logError('Failed to prepare the reminder channel', error);
      return failed(REMINDER_MESSAGES.channelFailed, buildOverview(loaded, settings, permission));
    }

    if (!isNotificationPermissionAllowed(permission)) {
      try {
        permission = await permissions.requestPermission();
      } catch (error) {
        logError('Failed to request notification permission', error);
        return failed(REMINDER_MESSAGES.permissionRequestFailed, buildOverview(loaded, settings, permission));
      }
      if (!isNotificationPermissionAllowed(permission)) {
        return { outcome: 'permission_denied', overview: buildOverview(loaded, settings, permission) };
      }
    }

    let notificationId: string;
    try {
      notificationId = await scheduler.scheduleDailyReminder(content);
    } catch (error) {
      logError('Failed to schedule a reminder', error);
      return failed(REMINDER_MESSAGES.scheduleFailed, buildOverview(loaded, settings, permission));
    }

    const previous = getScheduleRecord(settings, id);
    const next = setScheduleRecord(
      updateReminder(settings, id, { enabled: true }, now().toISOString()),
      id,
      createRecord(id, notificationId, reminder.hour, reminder.minute),
    );

    const saveError = await saveSettings(next);
    if (saveError) {
      await cancelSafely(notificationId);
      return failed(
        saveError === REMINDER_MESSAGES.saveFailed ? REMINDER_MESSAGES.enableSaveFailed : saveError,
        buildOverview(loaded, settings, permission),
      );
    }

    const stored = { ...loaded, stored: true };
    if (previous && previous.notificationId !== notificationId && !(await cancelSafely(previous.notificationId))) {
      return {
        outcome: 'success',
        overview: buildOverview(stored, next, permission, REMINDER_MESSAGES.cleanupPending),
        warning: REMINDER_MESSAGES.cleanupPending,
      };
    }
    return { outcome: 'success', overview: buildOverview(stored, next, permission), warning: null };
  };

  const disableReminder = async (id: ReminderId): Promise<ReminderActionResult> => {
    const loaded = await loadSettings();
    const { settings } = loaded;
    if (loaded.issue === 'unsupported_version') {
      return failed(REMINDER_MESSAGES.unsupportedVersion, buildOverview(loaded, settings, null));
    }

    const reminder = getReminder(settings, id);
    const record = getScheduleRecord(settings, id);
    if (!reminder.enabled && record === null) {
      return { outcome: 'success', overview: buildOverview(loaded, settings, await readPermission()), warning: null };
    }

    const disabled = updateReminder(settings, id, { enabled: false }, now().toISOString());
    const saveError = await saveSettings(disabled);
    if (saveError) {
      return failed(
        saveError === REMINDER_MESSAGES.saveFailed ? REMINDER_MESSAGES.disableSaveFailed : saveError,
        buildOverview(loaded, settings, await readPermission()),
      );
    }

    const stored = { ...loaded, stored: true };
    const permission = await readPermission();
    if (record === null) {
      return { outcome: 'success', overview: buildOverview(stored, disabled, permission), warning: null };
    }

    if (!(await cancelSafely(record.notificationId))) {
      return {
        outcome: 'success',
        overview: buildOverview(stored, disabled, permission, REMINDER_MESSAGES.disableCancelFailed),
        warning: REMINDER_MESSAGES.disableCancelFailed,
      };
    }

    const cleared = setScheduleRecord(disabled, id, null);
    const clearError = await saveSettings(cleared);
    return {
      outcome: 'success',
      overview: buildOverview(stored, clearError ? disabled : cleared, permission),
      warning: null,
    };
  };

  const changeTime = async (id: ReminderId, hour: number, minute: number): Promise<ReminderActionResult> => {
    if (!isValidReminderTime(hour, minute)) {
      return failed(REMINDER_MESSAGES.invalidTime, null);
    }

    const loaded = await loadSettings();
    const { settings } = loaded;
    if (loaded.issue === 'unsupported_version') {
      return failed(REMINDER_MESSAGES.unsupportedVersion, buildOverview(loaded, settings, null));
    }

    const reminder = getReminder(settings, id);
    const permission = await readPermission();
    if (reminder.hour === hour && reminder.minute === minute) {
      return { outcome: 'success', overview: buildOverview(loaded, settings, permission), warning: null };
    }

    const updated = updateReminder(settings, id, { hour, minute }, now().toISOString());
    const stored = { ...loaded, stored: true };

    if (!reminder.enabled || !isNotificationPermissionAllowed(permission)) {
      if (reminder.enabled && permission === null) {
        return failed(REMINDER_MESSAGES.permissionCheckFailed, buildOverview(loaded, settings, null));
      }
      const saveError = await saveSettings(updated);
      if (saveError) {
        return failed(saveError, buildOverview(loaded, settings, permission));
      }
      return { outcome: 'success', overview: buildOverview(stored, updated, permission), warning: null };
    }

    const content = buildReminderNotificationContent(getReminder(updated, id));
    let notificationId: string;
    try {
      await scheduler.ensureReminderChannel();
      notificationId = await scheduler.scheduleDailyReminder(content);
    } catch (error) {
      logError('Failed to schedule the replacement reminder', error);
      return failed(REMINDER_MESSAGES.replaceFailed, buildOverview(loaded, settings, permission));
    }

    const previous = getScheduleRecord(settings, id);
    const next = setScheduleRecord(updated, id, createRecord(id, notificationId, hour, minute));
    const saveError = await saveSettings(next);
    if (saveError) {
      await cancelSafely(notificationId);
      return failed(
        saveError === REMINDER_MESSAGES.saveFailed ? REMINDER_MESSAGES.replaceFailed : saveError,
        buildOverview(loaded, settings, permission),
      );
    }

    if (previous && previous.notificationId !== notificationId && !(await cancelSafely(previous.notificationId))) {
      return {
        outcome: 'success',
        overview: buildOverview(stored, next, permission, REMINDER_MESSAGES.replaceCleanupFailed),
        warning: REMINDER_MESSAGES.replaceCleanupFailed,
      };
    }
    return { outcome: 'success', overview: buildOverview(stored, next, permission), warning: null };
  };

  const runAction = (action: () => Promise<ReminderActionResult>): Promise<ReminderActionResult> =>
    queue.run(async () => {
      try {
        return await action();
      } catch (error) {
        if (error instanceof ReminderServiceError) {
          return failed(error.message, null);
        }
        logError('Unexpected reminder failure', error);
        return failed(REMINDER_MESSAGES.scheduleFailed, null);
      }
    });

  return {
    reconcile: () => queue.run(async () => reconcileLoaded(await loadSettings())),

    reconcileIfConfigured: () =>
      queue.run(async () => {
        const loaded = await loadSettings();
        return loaded.stored ? reconcileLoaded(loaded) : null;
      }),

    setReminderEnabled: (id, enabled) => runAction(() => (enabled ? enableReminder(id) : disableReminder(id))),

    changeReminderTime: (id, hour, minute) => runAction(() => changeTime(id, hour, minute)),

    openSystemSettings: () => permissions.openSystemSettings(),
  };
}
