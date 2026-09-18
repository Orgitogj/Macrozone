import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { KeyValueRow } from '@/components/ui/KeyValueRow';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { SyncStatusBadge } from '@/features/account/components/SyncStatusBadge';
import type { SyncStatusView } from '@/features/account/hooks/useSyncStatus';
import { spacing } from '@/theme';

type SyncStatusCardProps = {
  sync: SyncStatusView;
  onManageConflicts: () => void;
};

export function SyncStatusCard({ sync, onManageConflicts }: SyncStatusCardProps) {
  return (
    <AppCard style={styles.card}>
      <SyncStatusBadge kind={sync.status.kind} label={sync.status.label} />
      <AppText variant='body' tone='secondary'>
        {sync.status.detail}
      </AppText>

      <View style={styles.rows}>
        <KeyValueRow label='Last successful sync' value={sync.lastSyncLabel} />
        <KeyValueRow label='Changes waiting' value={`${sync.pendingCount}`} />
        <KeyValueRow label='Needs your decision' value={`${sync.conflictCount}`} />
        <KeyValueRow label='Connection' value={sync.online ? 'Online' : 'Offline'} />
      </View>

      {sync.failureMessage !== null ? <NoticeCard tone='warning' message={sync.failureMessage} /> : null}

      <View style={styles.actions}>
        <AppButton
          label={sync.syncing ? 'Syncing…' : 'Sync Now'}
          onPress={sync.syncNow}
          loading={sync.syncing}
          disabled={sync.syncing || !sync.online}
          accessibilityHint={
            sync.online ? 'Sends waiting changes and checks the cloud for new ones' : 'Available when you are back online'
          }
        />
        {sync.conflictCount > 0 ? (
          <AppButton
            label={`Manage Conflicts (${sync.conflictCount})`}
            variant='secondary'
            onPress={onManageConflicts}
            accessibilityHint='Opens the changes that need your decision'
          />
        ) : null}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  rows: {
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
  },
});
