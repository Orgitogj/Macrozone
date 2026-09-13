import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { MealRow } from '@/features/meals/components/MealRow';
import type { Meal } from '@/features/meals/types';
import { colors } from '@/styles/global';

type DayMealListProps = {
  meals: readonly Meal[];
  emptyMessage: string;
  onRequestDelete: (meal: Meal) => void;
};

export function DayMealList({
  meals,
  emptyMessage,
  onRequestDelete,
}: DayMealListProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle} accessibilityRole='header'>
        Meals
      </Text>
      {meals.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        meals.map((meal) => (
          <MealRow key={meal.id} meal={meal} onRequestDelete={onRequestDelete} />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
});
