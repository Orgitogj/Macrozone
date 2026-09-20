import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextButton } from '@/components/ui/TextButton';
import type { PendingDeletion } from '@/features/account/services/deletionBarrier';
import { spacing } from '@/theme';

type DeletionPendingCardProps = {
  pending: PendingDeletion;
  busy?: boolean;
  onFinish?: () => void;
  onCancel: () => void;
};

export function describePendingDeletion(pending: PendingDeletion): string {
  if (pending.stage === 'unconfirmed') {
    return 'MacroZone could not confirm whether your cloud account was deleted. Nothing on this device has been changed or removed since then.';
  }
  return pending.mode === 'copy_to_guest'
    ? 'Your account data was copied to this device and the cloud account still has to be deleted.'
    : 'The cloud account still has to be deleted.';
}

export function DeletionPendingCard({ pending, busy = false, onFinish, onCancel }: DeletionPendingCardProps) {
  return (
    <AppCard style={styles.card}>
      <SectionHeader title='Deletion waiting to finish' />
      <AppText variant='body' tone='secondary'>
        {describePendingDeletion(pending)}
      </AppText>
      <AppText variant='body' tone='secondary'>
        Until you finish or cancel it, this account is read-only on this device: logging, editing and syncing are paused so
        the copy stays exactly as it was.
      </AppText>
      {pending.mode === 'copy_to_guest' ? (
        <AppText variant='caption' tone='secondary'>
          Cancelling keeps both the account and the copy already on this device.
        </AppText>
      ) : null}
      <View style={styles.actions}>
        {onFinish !== undefined ? (
          <AppButton
            label='Finish Deleting'
            variant='danger'
            onPress={onFinish}
            disabled={busy}
            accessibilityHint='Asks for your password again and retries deleting the cloud account'
          />
        ) : null}
        <TextButton label='Cancel deletion and keep my account' onPress={onCancel} disabled={busy} />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
});
