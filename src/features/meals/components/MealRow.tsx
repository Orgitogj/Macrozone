import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import type { Meal } from '@/features/meals/types';
import { colors } from '@/styles/global';
import { formatCalories, formatGrams } from '@/utils/format';

type MealRowProps = {
  meal: Meal;
  onRequestDelete: (meal: Meal) => void;
};

export function MealRow({ meal, onRequestDelete }: MealRowProps) {
  const calories = formatCalories(meal.calories);
  const protein = formatGrams(meal.protein);
  const carbs = formatGrams(meal.carbs);
  const fat = formatGrams(meal.fat);

  return (
    <TouchableOpacity
      style={styles.container}
      onLongPress={() => onRequestDelete(meal)}
      accessibilityLabel={`${meal.name}, ${calories} calories, ${protein} protein, ${carbs} carbs, ${fat} fat`}
      accessibilityHint='Long press to delete this meal'
      accessibilityActions={[{ name: 'longpress', label: 'Delete meal' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'longpress') {
          onRequestDelete(meal);
        }
      }}
    >
      <Text style={styles.name}>{meal.name}</Text>
      <Text style={styles.macros}>
        {calories} cal • {protein} P • {carbs} C • {fat} F
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  macros: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
