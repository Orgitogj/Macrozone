import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import type { AiInputKind } from '@/features/ai-meal/types';
import { spacing, useTheme } from '@/theme';

type AnalysisProgressProps = {
  inputKind: AiInputKind;
  onCancel: () => void;
};

export function AnalysisProgress({ inputKind, onCancel }: AnalysisProgressProps) {
  const { colors } = useTheme();
  const message = inputKind === 'photo' ? 'Estimating nutrition from your photo…' : 'Estimating nutrition from your description…';

  return (
    <AppCard style={styles.card}>
      <View style={styles.row} accessible accessibilityRole='progressbar' accessibilityLabel={message} accessibilityLiveRegion='polite'>
        <ActivityIndicator color={colors.primary} />
        <View style={styles.text}>
          <AppText variant='bodyStrong'>{message}</AppText>
          <AppText variant='caption' tone='secondary'>
            This can take up to a minute. You can cancel at any time.
          </AppText>
        </View>
      </View>
      <AppButton label='Cancel' variant='secondary' onPress={onCancel} accessibilityHint='Stops this estimate. Your input is kept.' />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
});
