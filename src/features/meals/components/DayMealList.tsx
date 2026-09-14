import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { TextButton } from '@/components/ui/TextButton';
import { MealRow } from '@/features/meals/components/MealRow';
import type { Meal } from '@/features/meals/types';
import { colors } from '@/styles/global';

type DayMealListProps = {
  meals: readonly Meal[];
  emptyMessage: string;
  onPressMeal: (meal: Meal) => void;
  onRequestDelete: (meal: Meal) => void;
  onClearDay: () => void;
};

export function DayMealList({
  meals,
  emptyMessage,
  onPressMeal,
  onRequestDelete,
  onClearDay,
}: DayMealListProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle} accessibilityRole='header'>
          Meals
        </Text>
        {meals.length > 0 ? (
          <TextButton
            label='Clear Day'
            tone='danger'
            onPress={onClearDay}
            accessibilityHint='Deletes every meal logged on this day after confirmation'
          />
        ) : null}
      </View>
      {meals.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        meals.map((meal) => (
          <MealRow
            key={meal.id}
            meal={meal}
            onPress={onPressMeal}
            onRequestDelete={onRequestDelete}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
});
