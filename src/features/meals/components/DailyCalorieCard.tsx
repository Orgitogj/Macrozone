import { StyleSheet, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { MacroGoalProgress } from '@/features/nutrition-goals/types';
import { describeGoalProgress } from '@/features/nutrition-goals/utils/goalProgress';
import { spacing, useTheme } from '@/theme';
import { formatCalories } from '@/utils/format';

type DailyCalorieCardProps = {
  progress: MacroGoalProgress;
};

export function DailyCalorieCard({ progress }: DailyCalorieCardProps) {
  const { colors } = useTheme();
  const description = describeGoalProgress('Calories', progress, formatCalories);
  const statusTone = description.isOver ? 'danger' : description.hasTarget ? 'success' : 'secondary';

  return (
    <AppCard accessible accessibilityLabel={description.accessibilityText}>
      <View style={styles.header}>
        <AppText variant='label' tone='secondary'>
          Calories
        </AppText>
        <AppText variant='label' tone={statusTone}>
          {description.statusText}
        </AppText>
      </View>
      <View style={styles.amounts}>
        <AppText variant='display'>{formatCalories(progress.consumed)}</AppText>
        <AppText variant='body' tone='secondary' style={styles.target}>
          {description.hasTarget ? `of ${formatCalories(progress.goal)} kcal` : 'kcal eaten'}
        </AppText>
      </View>
      {description.hasTarget ? (
        <ProgressBar
          fraction={description.fraction}
          color={colors.calories}
          isOver={description.isOver}
          accessibilityLabel={description.accessibilityText}
        />
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  target: {
    flexShrink: 1,
  },
});
