import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { MEAL_TYPE_LABELS } from '@/features/meals/constants';
import type { Meal } from '@/features/meals/types';
import { borderWidths, iconSizes, opacity, radii, spacing, touchTargets, useThemedStyles, type Theme } from '@/theme';
import { formatCalories, formatGrams } from '@/utils/format';
import { formatTimeLabel } from '@/utils/time';

type MealRowProps = {
  meal: Meal;
  onPress: (meal: Meal) => void;
  onRequestDelete: (meal: Meal) => void;
  showMealType?: boolean;
  disabled?: boolean;
};

export function MealRow({ meal, onPress, onRequestDelete, showMealType = true, disabled = false }: MealRowProps) {
  const styles = useThemedStyles(createStyles);
  const calories = formatCalories(meal.calories);
  const protein = formatGrams(meal.protein);
  const carbs = formatGrams(meal.carbs);
  const fat = formatGrams(meal.fat);
  const timeLabel = meal.time === null ? null : formatTimeLabel(meal.time);
  const context = [showMealType ? MEAL_TYPE_LABELS[meal.mealType] : null, timeLabel].filter(Boolean).join(' · ');

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.content, pressed && styles.pressed]}
        onPress={() => onPress(meal)}
        onLongPress={() => onRequestDelete(meal)}
        disabled={disabled}
        accessibilityRole='button'
        accessibilityLabel={`${meal.name}${context ? `, ${context}` : ''}, ${calories} calories, ${protein} protein, ${carbs} carbs, ${fat} fat`}
        accessibilityHint='Opens meal details'
        accessibilityState={{ disabled }}
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
        <View style={styles.titleRow}>
          <AppText variant='bodyStrong' numberOfLines={2} style={styles.name}>
            {meal.name}
          </AppText>
          <AppText variant='bodyStrong'>{calories}</AppText>
        </View>
        <AppText variant='caption' tone='secondary'>
          {context ? `${context} · ` : ''}P {protein} · C {carbs} · F {fat}
        </AppText>
      </Pressable>
      <IconButton
        icon='trash-outline'
        size={iconSizes.md}
        tone='secondary'
        onPress={() => onRequestDelete(meal)}
        disabled={disabled}
        accessibilityLabel={`Delete ${meal.name}`}
        style={styles.deleteButton}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: radii.md,
      borderWidth: borderWidths.hairline,
      borderColor: theme.colors.border,
    },
    content: {
      flex: 1,
      paddingVertical: spacing.md,
      paddingLeft: spacing.lg,
      paddingRight: spacing.sm,
      gap: spacing.xxs,
    },
    pressed: {
      opacity: opacity.pressed,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    name: {
      flex: 1,
    },
    deleteButton: {
      width: touchTargets.min,
      height: touchTargets.min,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
