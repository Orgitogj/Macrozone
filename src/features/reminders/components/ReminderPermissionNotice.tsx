import { NoticeCard } from '@/components/ui/NoticeCard';
import { TextButton } from '@/components/ui/TextButton';
import type { NotificationPermissionSnapshot } from '@/features/reminders/types';
import { describeNotificationPermission } from '@/features/reminders/utils/reminderPermissions';

type ReminderPermissionNoticeProps = {
  permission: NotificationPermissionSnapshot | null;
  disabled: boolean;
  onOpenSettings: () => void;
  onCheckAgain: () => void;
};

export function ReminderPermissionNotice({
  permission,
  disabled,
  onOpenSettings,
  onCheckAgain,
}: ReminderPermissionNoticeProps) {
  const description = describeNotificationPermission(permission);
  if (!description) {
    return null;
  }

  return (
    <NoticeCard tone={description.tone} title={description.title} message={description.message}>
      {description.showSettings ? (
        <TextButton
          label='Open Settings'
          size='small'
          icon='settings-outline'
          onPress={onOpenSettings}
          disabled={disabled}
          accessibilityHint='Opens system settings for MacroZone, where you can allow notifications'
        />
      ) : null}
      {permission === null ? (
        <TextButton label='Check again' size='small' onPress={onCheckAgain} disabled={disabled} />
      ) : null}
    </NoticeCard>
  );
}
