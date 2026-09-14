import { StyleSheet, View } from 'react-native';

import { DailyCalorieCard } from '@/features/meals/components/DailyCalorieCard';
import { MacroProgressCard } from '@/features/meals/components/MacroProgressCard';
import type { MacroGoalBreakdown } from '@/features/nutrition-goals/types';
import { spacing, useTheme } from '@/theme';

type DailyNutritionSummaryProps = {
  progress: MacroGoalBreakdown;
};

export function DailyNutritionSummary({ progress }: DailyNutritionSummaryProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <DailyCalorieCard progress={progress.calories} />
      <View style={styles.macros}>
        <MacroProgressCard label='Protein' color={colors.protein} progress={progress.protein} />
        <MacroProgressCard label='Carbs' color={colors.carbs} progress={progress.carbs} />
        <MacroProgressCard label='Fat' color={colors.fat} progress={progress.fat} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  macros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
