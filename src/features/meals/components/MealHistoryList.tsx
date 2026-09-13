import {
  SectionList,
  StyleSheet,
  Text,
  View,
  type SectionListData,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { MealRow } from '@/features/meals/components/MealRow';
import type { Meal, MealDateGroup } from '@/features/meals/types';
import { colors } from '@/styles/global';
import type { LocalDateKey } from '@/utils/date';
import { formatDayLabel } from '@/utils/date';
import { formatCalories } from '@/utils/format';

type HistorySection = SectionListData<
  Meal,
  { key: LocalDateKey; title: string; calories: string }
>;

type MealHistoryListProps = {
  groups: readonly MealDateGroup[];
  todayKey: LocalDateKey;
  onRequestDelete: (meal: Meal) => void;
  style?: StyleProp<ViewStyle>;
};

export function MealHistoryList({
  groups,
  todayKey,
  onRequestDelete,
  style,
}: MealHistoryListProps) {
  const sections: HistorySection[] = groups.map((group) => ({
    key: group.dateKey,
    title: formatDayLabel(group.dateKey, todayKey),
    calories: `${formatCalories(group.totals.calories)} cal`,
    data: group.meals,
  }));

  return (
    <SectionList
      style={style}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(meal) => meal.id}
      stickySectionHeadersEnabled={false}
      renderItem={({ item }) => (
        <MealRow meal={item} onRequestDelete={onRequestDelete} />
      )}
      renderSectionHeader={({ section }) => (
        <View
          style={styles.sectionHeader}
          accessible
          accessibilityRole='header'
          accessibilityLabel={`${section.title}, ${section.calories}`}
        >
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionCalories}>{section.calories}</Text>
        </View>
      )}
      ListEmptyComponent={<EmptyState message='No meals logged yet.' />}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  sectionCalories: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
