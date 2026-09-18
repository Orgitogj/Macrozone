import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { useAccountSession } from '@/features/account/hooks/useAccountSession';
import { useAccountNavigation } from '@/features/account/hooks/useAccountNavigation';
import { useSyncStatus } from '@/features/account/hooks/useSyncStatus';
import { iconSizes, opacity, spacing, touchTargets, useTheme } from '@/theme';

export function AccountEntryCard() {
  const { colors } = useTheme();
  const state = useAccountSession();
  const sync = useSyncStatus();
  const navigation = useAccountNavigation();

  const signedIn = state.status === 'signed_in';
  const detail = signedIn ? sync.status.label : 'Using MacroZone locally. Add optional cloud backup any time.';

  return (
    <Pressable
      onPress={navigation.openAccount}
      accessibilityRole='button'
      accessibilityLabel='Account and sync'
      accessibilityHint={signedIn ? 'Opens your account, backup status and conflicts' : 'Opens sign in and cloud backup options'}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <AppCard style={styles.card}>
        <Ionicons name='cloud-outline' size={iconSizes.lg} color={colors.primary} />
        <View style={styles.texts}>
          <AppText variant='subheading'>Account &amp; sync</AppText>
          <AppText variant='caption' tone='secondary'>
            {detail}
          </AppText>
        </View>
        <Ionicons name='chevron-forward' size={iconSizes.md} color={colors.textMuted} />
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
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
