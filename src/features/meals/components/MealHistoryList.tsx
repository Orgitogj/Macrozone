import type { ReactElement } from 'react';
import { SectionList, StyleSheet, View, type SectionListData } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextButton } from '@/components/ui/TextButton';
import { MealRow } from '@/features/meals/components/MealRow';
import type { Meal, MealDateGroup } from '@/features/meals/types';
import { spacing } from '@/theme';
import type { LocalDateKey } from '@/utils/date';
import { formatDayLabel } from '@/utils/date';
import { formatCalories } from '@/utils/format';

type HistorySection = SectionListData<Meal, { key: LocalDateKey; title: string; detail: string }>;

type MealHistoryListProps = {
  groups: readonly MealDateGroup[];
  todayKey: LocalDateKey;
  header: ReactElement;
  disabled: boolean;
  onPressMeal: (meal: Meal) => void;
  onRequestDelete: (meal: Meal) => void;
  onClearDay: (dateKey: LocalDateKey) => void;
  onDeleteAll: () => void;
};

export function MealHistoryList({
  groups,
  todayKey,
  header,
  disabled,
  onPressMeal,
  onRequestDelete,
  onClearDay,
  onDeleteAll,
}: MealHistoryListProps) {
  const sections: HistorySection[] = groups.map((group) => ({
    key: group.dateKey,
    title: formatDayLabel(group.dateKey, todayKey),
    detail: `${formatCalories(group.totals.calories)} kcal · ${group.meals.length === 1 ? '1 meal' : `${group.meals.length} meals`}`,
    data: group.meals,
  }));

  return (
    <SectionList
      sections={sections}
      keyExtractor={(meal) => meal.id}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.content}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <MealRow meal={item} disabled={disabled} onPress={onPressMeal} onRequestDelete={onRequestDelete} />
      )}
      renderSectionHeader={({ section }) => (
        <SectionHeader
          title={section.title}
          detail={section.detail}
          style={styles.sectionHeader}
          trailing={
            <TextButton
              label='Clear Day'
              tone='danger'
              size='small'
              onPress={() => onClearDay(section.key)}
              disabled={disabled}
              accessibilityLabel={`Clear ${section.title}`}
              accessibilityHint='Deletes every meal logged on this day after confirmation'
            />
          }
        />
      )}
      ItemSeparatorComponent={Separator}
      ListEmptyComponent={<EmptyState title='No meals yet' message='Meals you log will appear here, grouped by day.' />}
      ListFooterComponent={
        groups.length > 0 ? (
          <View style={styles.footer}>
            <TextButton
              label='Delete all history'
              tone='danger'
              size='small'
              onPress={onDeleteAll}
              disabled={disabled}
              accessibilityHint='Deletes every logged meal after confirmation'
            />
          </View>
        ) : null
      }
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.huge,
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  separator: {
    height: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
  },
});
