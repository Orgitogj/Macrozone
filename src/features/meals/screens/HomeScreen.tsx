import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppLoader } from '@/components/ui/AppLoader';
import { DateNavigator } from '@/components/ui/DateNavigator';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { CopySummaryButton } from '@/features/meals/components/CopySummaryButton';
import { DayMealList } from '@/features/meals/components/DayMealList';
import { MacroGrid } from '@/features/meals/components/MacroGrid';
import { ShareSummaryButton } from '@/features/meals/components/ShareSummaryButton';
import { useMealNavigation } from '@/features/meals/hooks/useMealNavigation';
import { useMeals } from '@/features/meals/hooks/useMeals';
import {
  buildDailySummary,
  formatDailySummaryText,
} from '@/features/meals/utils/dailySummary';
import {
  getEffectiveGoals,
  PersonalizeGoalsCard,
  shouldOfferGoalPersonalization,
  useGoalsNavigation,
  useNutritionPlan,
} from '@/features/nutrition-goals';
import { useSelectedDate } from '@/hooks/useSelectedDate';
import { globalStyles } from '@/styles/global';
import { formatLongDate, getRelativeDayLabel } from '@/utils/date';

export function HomeScreen() {
  const { meals, status, errorMessage, retry, requestDeleteMeal, requestClearDay } = useMeals();
  const nutritionPlan = useNutritionPlan();
  const {
    selectedDateKey,
    todayKey,
    isToday,
    canGoToNextDay,
    goToPreviousDay,
    goToNextDay,
    goToToday,
  } = useSelectedDate();
  const navigation = useMealNavigation();
  const goalsNavigation = useGoalsNavigation();

  const planState = nutritionPlan.state;
  const plan = planState.status === 'ready' ? planState.plan : null;
  const summary = buildDailySummary(meals, selectedDateKey, getEffectiveGoals(plan));
  const summaryText = formatDailySummaryText(summary);
  const relativeLabel = getRelativeDayLabel(selectedDateKey, todayKey);
  const longDate = formatLongDate(selectedDateKey, todayKey);
  const isReady = status === 'ready' && planState.status === 'ready';
  const isLoading = status === 'loading' || planState.status === 'loading';

  return (
    <ScrollView style={globalStyles.container}>
      <View style={globalStyles.header}>
        <Text style={globalStyles.title} accessibilityRole='header'>
          MacroZone
        </Text>
        <View style={styles.headerActions}>
          <IconButton
            icon='options-outline'
            onPress={goalsNavigation.openGoals}
            accessibilityLabel='Nutrition goals'
            accessibilityHint='View or change your daily targets'
          />
          <ShareSummaryButton summaryText={summaryText} disabled={!isReady} />
        </View>
      </View>

      <DateNavigator
        title={relativeLabel ?? longDate}
        subtitle={relativeLabel ? longDate : undefined}
        onPrevious={goToPreviousDay}
        onNext={goToNextDay}
        canGoNext={canGoToNextDay}
        onToday={isToday ? undefined : goToToday}
      />

      {isLoading && status !== 'error' && planState.status !== 'error' ? (
        <AppLoader accessibilityLabel='Loading meals' />
      ) : null}

      {status === 'error' ? (
        <ErrorState message={errorMessage ?? 'Could not load your meals.'} onRetry={retry} />
      ) : null}

      {status !== 'error' && planState.status === 'error' ? (
        <ErrorState message={planState.message} onRetry={nutritionPlan.retry} />
      ) : null}

      {isReady && plan ? (
        <>
          {shouldOfferGoalPersonalization(plan) ? (
            <PersonalizeGoalsCard
              onSetUp={goalsNavigation.openCalculator}
              onDismiss={() => void nutritionPlan.dismissPersonalization()}
            />
          ) : null}
          <MacroGrid progress={summary.goalProgress} />
          <CopySummaryButton summaryText={summaryText} />
          <DayMealList
            meals={summary.meals}
            emptyMessage={
              isToday ? 'No meals logged today.' : 'No meals logged on this day.'
            }
            onPressMeal={(meal) => navigation.openMeal(meal.id)}
            onRequestDelete={requestDeleteMeal}
            onClearDay={() => requestClearDay(selectedDateKey, todayKey)}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
});
