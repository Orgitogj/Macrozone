import { StyleSheet, View } from 'react-native';

import { MacroCard } from '@/features/meals/components/MacroCard';
import type { DailyNutritionGoals } from '@/features/nutrition-goals';
import { colors } from '@/styles/global';
import type { MacroKey, MacroTotals } from '@/types/nutrition';
import { formatCalories, formatGrams } from '@/utils/format';

type MacroGridProps = {
  totals: MacroTotals;
  goals: DailyNutritionGoals;
};

const MACRO_CARDS: readonly {
  key: MacroKey;
  label: string;
  color: string;
  format: (value: number) => string;
}[] = [
  { key: 'calories', label: 'Calories', color: colors.macroCalories, format: formatCalories },
  { key: 'protein', label: 'Protein', color: colors.macroProtein, format: formatGrams },
  { key: 'carbs', label: 'Carbs', color: colors.macroCarbs, format: formatGrams },
  { key: 'fat', label: 'Fat', color: colors.macroFat, format: formatGrams },
];

export function MacroGrid({ totals, goals }: MacroGridProps) {
  return (
    <View style={styles.grid}>
      {MACRO_CARDS.map(({ key, label, color, format }) => (
        <MacroCard
          key={key}
          label={label}
          value={format(totals[key])}
          goal={format(goals[key])}
          color={color}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
