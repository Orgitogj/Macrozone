import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { componentSizes, radii, spacing, useThemedStyles, type Theme } from '@/theme';

type StepHeaderProps = {
  current: number;
  total: number;
  title: string;
  subtitle?: string;
};

export function StepHeader({ current, total, title, subtitle }: StepHeaderProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <AppText variant='micro' tone='secondary' accessibilityLabel={`Step ${current} of ${total}`}>
        STEP {current} OF {total}
      </AppText>
      <View style={styles.track} importantForAccessibility='no-hide-descendants'>
        {Array.from({ length: total }, (_, index) => (
          <View key={index} style={[styles.segment, index < current && styles.segmentDone]} />
        ))}
      </View>
      <AppText variant='heading' accessibilityRole='header' style={styles.title}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant='body' tone='secondary'>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    track: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    segment: {
      flex: 1,
      height: componentSizes.stepIndicator,
      borderRadius: radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
    },
    segmentDone: {
      backgroundColor: theme.colors.primary,
    },
    title: {
      marginTop: spacing.xs,
    },
  });
