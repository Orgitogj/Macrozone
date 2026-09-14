import { StyleSheet, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { MacroGoalProgress } from '@/features/nutrition-goals/types';
import { describeGoalProgress } from '@/features/nutrition-goals/utils/goalProgress';
import { spacing } from '@/theme';
import { formatGrams } from '@/utils/format';

type MacroProgressCardProps = {
  label: string;
  color: string;
  progress: MacroGoalProgress;
};

export function MacroProgressCard({ label, color, progress }: MacroProgressCardProps) {
  const description = describeGoalProgress(label, progress, formatGrams);

  return (
    <AppCard padding='md' style={styles.card} accessible accessibilityLabel={description.accessibilityText}>
      <View style={styles.labelRow}>
        <View style={[styles.swatch, { backgroundColor: color }]} />
        <AppText variant='label' tone='secondary' numberOfLines={1} style={styles.label}>
          {label}
        </AppText>
      </View>
      <AppText variant='subheading'>{formatGrams(progress.consumed)}</AppText>
      <AppText variant='caption' tone='secondary'>
        {description.hasTarget ? `of ${formatGrams(progress.goal)}` : 'No target'}
      </AppText>
      {description.hasTarget ? (
        <ProgressBar
          size='compact'
          fraction={description.fraction}
          color={color}
          isOver={description.isOver}
          accessibilityLabel={description.accessibilityText}
          style={styles.progress}
        />
      ) : null}
      {description.hasTarget ? (
        <AppText variant='micro' tone={description.isOver ? 'danger' : 'secondary'}>
          {description.statusText}
        </AppText>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: 96,
    gap: spacing.xxs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  swatch: {
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: spacing.xs,
  },
  label: {
    flexShrink: 1,
  },
  progress: {
    marginVertical: spacing.xs,
  },
});
