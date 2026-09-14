import { StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppText } from '@/components/ui/AppText';
import { ErrorState } from '@/components/ui/ErrorState';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { TextButton } from '@/components/ui/TextButton';
import { ReminderCard } from '@/features/reminders/components/ReminderCard';
import { ReminderPermissionNotice } from '@/features/reminders/components/ReminderPermissionNotice';
import { REMINDER_MESSAGES } from '@/features/reminders/constants';
import { useReminderSettings } from '@/features/reminders/hooks/useReminderSettings';
import type { ReminderStorageIssue } from '@/features/reminders/types';
import { spacing } from '@/theme';

const STORAGE_ISSUE_MESSAGES: Readonly<Record<ReminderStorageIssue, string>> = {
  recovered: REMINDER_MESSAGES.recovered,
  unreadable: REMINDER_MESSAGES.unreadable,
  unsupported_version: REMINDER_MESSAGES.unsupportedVersion,
};

export function RemindersScreen() {
  const reminders = useReminderSettings();
  const { resource } = reminders;

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        <AppText variant='body' tone='secondary'>
          Reminders are stored on this device and follow your device’s local time.
        </AppText>

        {!reminders.supported ? (
          <NoticeCard
            title='Available in the mobile app'
            message='Meal reminders are available in the MacroZone Android and iOS apps. They are not supported in the browser.'
          />
        ) : null}

        {reminders.supported && resource.status === 'loading' ? (
          <AppLoader accessibilityLabel='Loading meal reminders' />
        ) : null}

        {reminders.supported && resource.status === 'error' ? (
          <ErrorState message={resource.message} onRetry={reminders.refresh} />
        ) : null}

        {reminders.supported && resource.status === 'ready' ? (
          <>
            {resource.refreshError ? (
              <NoticeCard tone='warning' message={resource.refreshError}>
                <TextButton label='Try again' size='small' onPress={reminders.refresh} />
              </NoticeCard>
            ) : null}

            {resource.data.storageIssue ? (
              <NoticeCard
                tone={resource.data.readOnly ? 'danger' : 'warning'}
                message={STORAGE_ISSUE_MESSAGES[resource.data.storageIssue]}
              />
            ) : null}

            <ReminderPermissionNotice
              permission={resource.data.permission}
              disabled={reminders.isBusy}
              onOpenSettings={reminders.openSystemSettings}
              onCheckAgain={reminders.refresh}
            />

            {resource.data.notice ? (
              <NoticeCard tone='warning' message={resource.data.notice}>
                <TextButton label='Try again' size='small' onPress={reminders.refresh} disabled={reminders.isBusy} />
              </NoticeCard>
            ) : null}

            {reminders.actionNotice && reminders.actionNotice !== resource.data.notice ? (
              <NoticeCard tone='warning' message={reminders.actionNotice} />
            ) : null}

            {reminders.cards.map((card) => (
              <ReminderCard
                key={card.id}
                reminder={card}
                disabled={reminders.isBusy || resource.data.readOnly}
                onToggle={(enabled) => reminders.setReminderEnabled(card.id, enabled)}
                onChangeTime={(selected) => reminders.changeReminderTime(card.id, selected)}
              />
            ))}
          </>
        ) : null}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
});
