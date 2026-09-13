import { StyleSheet, Text, View } from 'react-native';

import { AppLoader } from '@/components/ui/AppLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { TextButton } from '@/components/ui/TextButton';
import { MealHistoryList } from '@/features/meals/components/MealHistoryList';
import { useMeals } from '@/features/meals/hooks/useMeals';
import { groupMealsByDate } from '@/features/meals/utils/mealDates';
import { useTodayDateKey } from '@/hooks/useTodayDateKey';
import { globalStyles } from '@/styles/global';

export function MealHistoryScreen() {
  const { meals, status, errorMessage, retry, requestDeleteMeal, clearAll } =
    useMeals();
  const todayKey = useTodayDateKey();

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.header}>
        <Text style={globalStyles.title} accessibilityRole='header'>
          All Meals
        </Text>
        <TextButton
          label='Clear All'
          tone='danger'
          onPress={clearAll}
          disabled={status !== 'ready' || meals.length === 0}
          accessibilityHint='Deletes every logged meal'
        />
      </View>

      <View style={styles.body}>
        {status === 'loading' ? <AppLoader accessibilityLabel='Loading meals' /> : null}

        {status === 'error' ? (
          <ErrorState
            message={errorMessage ?? 'Could not load your meals.'}
            onRetry={retry}
          />
        ) : null}

        {status === 'ready' ? (
          <MealHistoryList
            groups={groupMealsByDate(meals)}
            todayKey={todayKey}
            onRequestDelete={requestDeleteMeal}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    marginTop: 30,
  },
});
