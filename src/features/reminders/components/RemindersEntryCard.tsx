import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { iconSizes, opacity, spacing, touchTargets, useTheme } from '@/theme';

type RemindersEntryCardProps = {
  onPress: () => void;
};

export function RemindersEntryCard({ onPress }: RemindersEntryCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel='Meal reminders'
      accessibilityHint='Opens daily reminder settings for breakfast, lunch, dinner and snacks'
      style={({ pressed }) => pressed && styles.pressed}
    >
      <AppCard style={styles.card}>
        <Ionicons name='notifications-outline' size={iconSizes.lg} color={colors.primary} />
        <View style={styles.texts}>
          <AppText variant='subheading'>Meal reminders</AppText>
          <AppText variant='caption' tone='secondary'>
            Get a daily nudge to log each meal. Stored on this device.
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
