import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { ConflictVersionCard } from '@/features/account/components/ConflictVersionCard';
import { useAccountNavigation } from '@/features/account/hooks/useAccountNavigation';
import { useConflicts } from '@/features/account/hooks/useConflicts';
import { describeConflict } from '@/features/account/utils/conflictPresentation';
import type { SyncConflictResolution } from '@/features/sync/types';
import { getSingleParam } from '@/utils/routeParams';
import { spacing } from '@/theme';

export function ConflictDetailScreen() {
  const params = useLocalSearchParams();
  const conflictId = getSingleParam(params.id) ?? '';
  const conflicts = useConflicts();
  const navigation = useAccountNavigation();

  const resolve = useCallback(
    (resolution: SyncConflictResolution) => {
      void (async () => {
        const resolved = await conflicts.resolve(conflictId, resolution);
        if (resolved) {
          navigation.goBack();
        }
      })();
    },
    [conflictId, conflicts, navigation],
  );

  if (conflicts.resource.status === 'loading') {
    return (
      <ScrollScreen edges={['bottom']}>
        <AppLoader accessibilityLabel='Loading this change' />
      </ScrollScreen>
    );
  }

  if (conflicts.resource.status === 'error') {
    return (
      <ScrollScreen edges={['bottom']}>
        <ErrorState message={conflicts.resource.message} onRetry={conflicts.retry} />
      </ScrollScreen>
    );
  }

  const conflict = conflicts.resource.data.find((candidate) => candidate.id === conflictId) ?? null;
  if (conflict === null) {
    return (
      <ScrollScreen edges={['bottom']}>
        <EmptyState
          title='Already decided'
          message='This change was resolved already, here or on another device.'
          action={<AppButton label='Back to Conflicts' variant='secondary' onPress={navigation.goBack} />}
        />
      </ScrollScreen>
    );
  }

  const view = describeConflict(conflict, new Date());
  const busy = conflicts.resolvingId !== null;

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <AppText variant='caption' tone='secondary'>
            {view.typeLabel}
          </AppText>
          <AppText variant='heading'>{view.title}</AppText>
          <AppText variant='body' tone='secondary'>
            {view.reasonTitle}. {view.reasonDetail}
          </AppText>
          <AppText variant='caption' tone='secondary'>
            {view.detectedLabel}
          </AppText>
        </View>

        {conflicts.resolveError !== null ? <NoticeCard tone='danger' message={conflicts.resolveError} /> : null}

        <ConflictVersionCard title='On this device' detail='What MacroZone has here' version={view.local} />
        <ConflictVersionCard title='In your account' detail='What your other devices have' version={view.cloud} />

        <View style={styles.actions}>
          <AppButton
            label='Keep Mine'
            onPress={() => resolve('keep_mine')}
            loading={busy}
            disabled={busy}
            accessibilityHint={view.keepMine.effect}
          />
          <AppText variant='caption' tone='secondary'>
            {view.keepMine.effect}
          </AppText>

          <AppButton
            label='Use Cloud'
            variant='secondary'
            onPress={() => resolve('use_cloud')}
            loading={busy}
            disabled={busy || !view.useCloud.available}
            accessibilityHint={view.useCloud.effect}
          />
          <AppText variant='caption' tone='secondary'>
            {view.useCloud.unavailableReason ?? view.useCloud.effect}
          </AppText>

          {view.duplicate.available ? (
            <>
              <AppButton
                label='Duplicate as New'
                variant='secondary'
                onPress={() => resolve('duplicate')}
                loading={busy}
                disabled={busy}
                accessibilityHint={view.duplicate.effect}
              />
              <AppText variant='caption' tone='secondary'>
                {view.duplicate.effect}
              </AppText>
            </>
          ) : null}

          <AppButton
            label='Decide Later'
            variant='secondary'
            onPress={navigation.goBack}
            disabled={busy}
            accessibilityHint='Leaves this change waiting. Everything else keeps syncing.'
          />
        </View>
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
  },
});
