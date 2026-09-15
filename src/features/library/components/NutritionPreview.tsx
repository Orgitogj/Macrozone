import { StyleSheet, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/theme';
import type { MacroTotals } from '@/types/nutrition';
import { formatCalories, formatGrams } from '@/utils/format';

type NutritionPreviewProps = {
  title: string;
  nutrition: MacroTotals | null;
  caption?: string;
  unavailableMessage?: string;
};

export function describeNutritionForAccessibility(nutrition: MacroTotals): string {
  return `${formatCalories(nutrition.calories)} calories, ${formatGrams(nutrition.protein)} protein, ${formatGrams(nutrition.carbs)} carbs, ${formatGrams(nutrition.fat)} fat`;
}

export function NutritionPreview({ title, nutrition, caption, unavailableMessage = 'Enter a valid amount to see nutrition.' }: NutritionPreviewProps) {
  return (
    <AppCard
      style={styles.card}
      accessible
      accessibilityLabel={`${title}: ${nutrition ? describeNutritionForAccessibility(nutrition) : unavailableMessage}${caption ? `. ${caption}` : ''}`}
    >
      <AppText variant='label' tone='secondary'>
        {title}
      </AppText>
      {nutrition ? (
        <>
          <AppText variant='heading'>{formatCalories(nutrition.calories)} kcal</AppText>
          <View style={styles.macros}>
            <AppText variant='caption' tone='secondary'>
              Protein {formatGrams(nutrition.protein)}
            </AppText>
            <AppText variant='caption' tone='secondary'>
              Carbs {formatGrams(nutrition.carbs)}
            </AppText>
            <AppText variant='caption' tone='secondary'>
              Fat {formatGrams(nutrition.fat)}
            </AppText>
          </View>
        </>
      ) : (
        <AppText variant='body' tone='muted'>
          {unavailableMessage}
        </AppText>
      )}
      {caption ? (
        <AppText variant='caption' tone='muted'>
          {caption}
        </AppText>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
  macros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: spacing.xxs,
  },
});
