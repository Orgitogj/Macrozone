import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextButton } from '@/components/ui/TextButton';
import { MealRow } from '@/features/meals/components/MealRow';
import type { Meal } from '@/features/meals/types';
import type { MealTypeSection } from '@/features/meals/utils/mealSections';
import { spacing } from '@/theme';
import { formatCalories } from '@/utils/format';

type MealSectionProps = {
  section: MealTypeSection;
  onAdd: () => void;
  onPressMeal: (meal: Meal) => void;
  onRequestDelete: (meal: Meal) => void;
  disabled?: boolean;
};

export function MealSection({ section, onAdd, onPressMeal, onRequestDelete, disabled = false }: MealSectionProps) {
  const hasMeals = section.meals.length > 0;

  return (
    <View style={styles.container}>
      <SectionHeader
        title={section.label}
        detail={hasMeals ? `${formatCalories(section.calories)} kcal` : undefined}
        trailing={
          <TextButton
            label='Add'
            icon='add'
            size='small'
            onPress={onAdd}
            disabled={disabled}
            accessibilityLabel={`Add ${section.label.toLowerCase()}`}
          />
        }
      />
      {hasMeals ? (
        <View style={styles.meals}>
          {section.meals.map((meal) => (
            <MealRow
              key={meal.id}
              meal={meal}
              showMealType={false}
              disabled={disabled}
              onPress={onPressMeal}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </View>
      ) : (
        <AppText variant='caption' tone='muted'>
          {section.emptyMessage}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  meals: {
    gap: spacing.sm,
  },
});
