import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { MEAL_REMINDER_CHANNEL } from '@/features/reminders/constants';
import type {
  NotificationPermissionService,
  NotificationResponseSource,
  NotificationScheduler,
} from '@/features/reminders/services/notificationPlatform';
import type { NotificationPermissionSnapshot } from '@/features/reminders/types';
import {
  mapNotificationPermission,
  type IosNotificationAuthorization,
} from '@/features/reminders/utils/reminderPermissions';
import type { ReminderNotificationResponse } from '@/features/reminders/utils/reminderResponses';

const IOS_AUTHORIZATION: Readonly<Record<Notifications.IosAuthorizationStatus, IosNotificationAuthorization>> = {
  [Notifications.IosAuthorizationStatus.NOT_DETERMINED]: 'not_determined',
  [Notifications.IosAuthorizationStatus.DENIED]: 'denied',
  [Notifications.IosAuthorizationStatus.AUTHORIZED]: 'authorized',
  [Notifications.IosAuthorizationStatus.PROVISIONAL]: 'provisional',
  [Notifications.IosAuthorizationStatus.EPHEMERAL]: 'ephemeral',
};

function toPermissionSnapshot(response: Notifications.NotificationPermissionsStatus): NotificationPermissionSnapshot {
  return mapNotificationPermission({
    status: response.status,
    granted: response.granted,
    canAskAgain: response.canAskAgain,
    iosAuthorization:
      Platform.OS === 'ios' && response.ios ? (IOS_AUTHORIZATION[response.ios.status] ?? 'not_determined') : null,
  });
}

function toReminderResponse(response: Notifications.NotificationResponse): ReminderNotificationResponse {
  return {
    key: `${response.notification.request.identifier}:${response.notification.date}`,
    isDefaultAction: response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER,
    data: response.notification.request.content.data,
  };
}

export function createExpoNotificationScheduler(): NotificationScheduler {
  return {
    ensureReminderChannel: async () => {
      if (Platform.OS !== 'android') {
        return;
      }
      await Notifications.setNotificationChannelAsync(MEAL_REMINDER_CHANNEL.id, {
        name: MEAL_REMINDER_CHANNEL.name,
        description: MEAL_REMINDER_CHANNEL.description,
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        enableVibrate: false,
        showBadge: false,
      });
    },

    scheduleDailyReminder: (content) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: { ...content.data },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: content.hour,
          minute: content.minute,
          channelId: MEAL_REMINDER_CHANNEL.id,
        },
      }),

    cancelScheduledNotification: (notificationId) => Notifications.cancelScheduledNotificationAsync(notificationId),

    listScheduledNotifications: async () => {
      const requests = await Notifications.getAllScheduledNotificationsAsync();
      return requests.map((request) => ({ notificationId: request.identifier, data: request.content.data }));
    },
  };
}

export function createExpoNotificationPermissionService(): NotificationPermissionService {
  return {
    getPermission: async () => toPermissionSnapshot(await Notifications.getPermissionsAsync()),

    requestPermission: async () =>
      toPermissionSnapshot(
        await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowSound: true, allowBadge: false },
        }),
      ),

    openSystemSettings: async () => {
      try {
        await Linking.openSettings();
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function createExpoNotificationResponseSource(): NotificationResponseSource {
  let presentationConfigured = false;

  return {
    configureForegroundPresentation: () => {
      if (presentationConfigured) {
        return;
      }
      presentationConfigured = true;
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    },

    getLastResponse: () => {
      const response = Notifications.getLastNotificationResponse();
      return response ? toReminderResponse(response) : null;
    },

    clearLastResponse: () => {
      Notifications.clearLastNotificationResponse();
    },

    subscribe: (listener) => {
      const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
        listener(toReminderResponse(response)),
      );
      return () => subscription.remove();
    },
  };
}
