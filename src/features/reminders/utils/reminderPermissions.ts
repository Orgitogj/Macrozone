import type { NotificationPermissionSnapshot, NotificationPermissionStatus } from '@/features/reminders/types';

export type IosNotificationAuthorization = 'not_determined' | 'denied' | 'authorized' | 'provisional' | 'ephemeral';

export type RawNotificationPermission = {
  status: 'granted' | 'denied' | 'undetermined';
  granted: boolean;
  canAskAgain: boolean;
  iosAuthorization: IosNotificationAuthorization | null;
};

const IOS_STATUS_MAP: Readonly<Record<IosNotificationAuthorization, NotificationPermissionStatus>> = {
  not_determined: 'undetermined',
  denied: 'denied',
  authorized: 'granted',
  provisional: 'provisional',
  ephemeral: 'ephemeral',
};

export function mapNotificationPermission(raw: RawNotificationPermission): NotificationPermissionSnapshot {
  if (raw.iosAuthorization !== null) {
    const status = IOS_STATUS_MAP[raw.iosAuthorization];
    return { status, canAskAgain: status === 'undetermined' && raw.canAskAgain };
  }
  if (raw.granted || raw.status === 'granted') {
    return { status: 'granted', canAskAgain: raw.canAskAgain };
  }
  return { status: raw.status === 'undetermined' ? 'undetermined' : 'denied', canAskAgain: raw.canAskAgain };
}

export function isNotificationPermissionAllowed(permission: NotificationPermissionSnapshot | null): boolean {
  return (
    permission !== null &&
    (permission.status === 'granted' || permission.status === 'provisional' || permission.status === 'ephemeral')
  );
}

export function canRequestNotificationPermission(permission: NotificationPermissionSnapshot): boolean {
  return !isNotificationPermissionAllowed(permission) && permission.canAskAgain;
}

export function describeNotificationPermission(
  permission: NotificationPermissionSnapshot | null,
): { tone: 'info' | 'warning' | 'danger'; title: string; message: string; showSettings: boolean } | null {
  if (permission === null) {
    return {
      tone: 'warning',
      title: 'Notification permission unknown',
      message: 'MacroZone could not check whether notifications are allowed.',
      showSettings: false,
    };
  }
  switch (permission.status) {
    case 'granted':
      return null;
    case 'provisional':
      return {
        tone: 'info',
        title: 'Delivered quietly',
        message:
          'Reminders are delivered quietly to Notification Center. You can allow banners and sounds in system settings.',
        showSettings: true,
      };
    case 'ephemeral':
      return {
        tone: 'info',
        title: 'Temporary permission',
        message: 'Notifications are allowed for now. This permission may expire.',
        showSettings: false,
      };
    case 'undetermined':
      return permission.canAskAgain
        ? {
            tone: 'info',
            title: 'Permission needed',
            message: 'MacroZone will ask to send notifications when you turn on your first reminder.',
            showSettings: false,
          }
        : {
            tone: 'warning',
            title: 'Notifications are off',
            message: 'Allow notifications for MacroZone in system settings to receive meal reminders.',
            showSettings: true,
          };
    case 'denied':
      return {
        tone: 'warning',
        title: 'Notifications are off',
        message: permission.canAskAgain
          ? 'Notifications are not allowed. Turn on a reminder to ask again, or allow them in system settings.'
          : 'Allow notifications for MacroZone in system settings to receive meal reminders.',
        showSettings: true,
      };
  }
}
