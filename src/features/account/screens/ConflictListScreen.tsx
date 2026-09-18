import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { TextButton } from '@/components/ui/TextButton';
import { useAccountNavigation } from '@/features/account/hooks/useAccountNavigation';
import { useAccountSession } from '@/features/account/hooks/useAccountSession';
import { useConflicts } from '@/features/account/hooks/useConflicts';
import { describeConflict } from '@/features/account/utils/conflictPresentation';
import { iconSizes, opacity, spacing, touchTargets, useTheme } from '@/theme';

export function ConflictListScreen() {
  const state = useAccountSession();
  const navigation = useAccountNavigation();
  const conflicts = useConflicts();
  const { colors } = useTheme();

  if (state.status !== 'signed_in') {
    return (
      <ScrollScreen edges={['bottom']}>
        <View style={styles.content}>
          <NoticeCard title='Sign in first' message='Conflicts only happen between your devices and your account.' />
          <AppButton label='Sign In' onPress={navigation.openSignIn} />
        </View>
      </ScrollScreen>
    );
  }

  if (conflicts.resource.status === 'loading') {
    return (
      <ScrollScreen edges={['bottom']}>
        <AppLoader accessibilityLabel='Loading changes that need your decision' />
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

  const items = conflicts.resource.data;
  const now = new Date();

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        {conflicts.resource.refreshError !== null ? (
          <NoticeCard tone='warning' message={conflicts.resource.refreshError}>
            <TextButton label='Try again' size='small' onPress={conflicts.refresh} />
          </NoticeCard>
        ) : null}

        {items.length === 0 ? (
          <EmptyState
            title='Nothing needs your decision'
            message='When the same item changes on two devices, MacroZone asks you which version to keep.'
            action={<AppButton label='Back to Account & Sync' variant='secondary' onPress={navigation.replaceWithAccount} />}
          />
        ) : (
          <>
            <AppText variant='body' tone='secondary'>
              These items changed in two places. Syncing continues for everything else while you decide.
            </AppText>
            {items.map((conflict) => {
              const view = describeConflict(conflict, now);
              return (
                <Pressable
                  key={conflict.id}
                  onPress={() => navigation.openConflict(conflict.id)}
                  accessibilityRole='button'
                  accessibilityLabel={`${view.typeLabel}: ${view.title}`}
                  accessibilityHint='Opens both versions so you can choose one'
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <AppCard style={styles.row}>
                    <View style={styles.texts}>
                      <AppText variant='caption' tone='secondary'>
                        {view.typeLabel}
                      </AppText>
                      <AppText variant='subheading'>{view.title}</AppText>
                      <AppText variant='caption' tone='secondary'>
                        {view.reasonTitle} · {view.detectedLabel}
                      </AppText>
                    </View>
                    <Ionicons name='chevron-forward' size={iconSizes.md} color={colors.textMuted} />
                  </AppCard>
                </Pressable>
              );
            })}
          </>
        )}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTargets.comfortable,
  },
  texts: {
    flex: 1,
    gap: spacing.xxs,
  },
  pressed: {
    opacity: opacity.pressed,
  },
});
