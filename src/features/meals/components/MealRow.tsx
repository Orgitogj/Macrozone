import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { MEAL_TYPE_LABELS } from '@/features/meals/constants';
import type { Meal } from '@/features/meals/types';
import { colors } from '@/styles/global';
import { formatCalories, formatGrams } from '@/utils/format';
import { formatTimeLabel } from '@/utils/time';

type MealRowProps = {
  meal: Meal;
  onPress: (meal: Meal) => void;
  onRequestDelete: (meal: Meal) => void;
};

export function MealRow({ meal, onPress, onRequestDelete }: MealRowProps) {
  const calories = formatCalories(meal.calories);
  const protein = formatGrams(meal.protein);
  const carbs = formatGrams(meal.carbs);
  const fat = formatGrams(meal.fat);
  const mealTypeLabel = MEAL_TYPE_LABELS[meal.mealType];
  const timeLabel = meal.time === null ? null : formatTimeLabel(meal.time);
  const context = timeLabel ? `${mealTypeLabel} · ${timeLabel}` : mealTypeLabel;

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.content, pressed && styles.pressed]}
        onPress={() => onPress(meal)}
        onLongPress={() => onRequestDelete(meal)}
        accessibilityRole='button'
        accessibilityLabel={`${meal.name}, ${context}, ${calories} calories, ${protein} protein, ${carbs} carbs, ${fat} fat`}
        accessibilityHint='Opens meal details'
        accessibilityActions={[
          { name: 'activate', label: 'Edit meal' },
          { name: 'delete', label: 'Delete meal' },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'delete') {
            onRequestDelete(meal);
          } else if (event.nativeEvent.actionName === 'activate') {
            onPress(meal);
          }
        }}
      >
        <Text style={styles.name} numberOfLines={2}>
          {meal.name}
        </Text>
        <Text style={styles.context}>{context}</Text>
        <Text style={styles.macros}>
          {calories} cal • {protein} P • {carbs} C • {fat} F
        </Text>
      </Pressable>
      <IconButton
        icon='trash-outline'
        size={22}
        color={colors.textSecondary}
        onPress={() => onRequestDelete(meal)}
        accessibilityLabel={`Delete ${meal.name}`}
        style={styles.deleteButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginBottom: 10,
    paddingRight: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  context: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 2,
  },
  macros: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  deleteButton: {
    padding: 11,
  },
});
