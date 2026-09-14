import { StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppLoader } from '@/components/ui/AppLoader';
import { DateNavigator } from '@/components/ui/DateNavigator';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextButton } from '@/components/ui/TextButton';
import { DailyNutritionSummary } from '@/features/meals/components/DailyNutritionSummary';
import { DailySummaryActions } from '@/features/meals/components/DailySummaryActions';
import { MealSection } from '@/features/meals/components/MealSection';
import { useMealNavigation } from '@/features/meals/hooks/useMealNavigation';
import { useMeals } from '@/features/meals/hooks/useMeals';
import { buildDailySummary, formatDailySummaryText } from '@/features/meals/utils/dailySummary';
import { groupMealsByType } from '@/features/meals/utils/mealSections';
import {
  getEffectiveGoals,
  PersonalizeGoalsCard,
  shouldOfferGoalPersonalization,
  useGoalsNavigation,
  useNutritionPlan,
} from '@/features/nutrition-goals';
import { useSelectedDate } from '@/hooks/useSelectedDate';
import { spacing } from '@/theme';
import { getResourceData } from '@/utils/asyncResource';
import { formatLongDate, getRelativeDayLabel } from '@/utils/date';

export function HomeScreen() {
  const mealsState = useMeals();
  const nutritionPlan = useNutritionPlan();
  const selectedDate = useSelectedDate();
  const mealNavigation = useMealNavigation();
  const goalsNavigation = useGoalsNavigation();

  const { selectedDateKey, todayKey, isToday } = selectedDate;
  const planResource = nutritionPlan.resource;
  const mealsResource = mealsState.resource;
  const plan = getResourceData(planResource);

  const summary = buildDailySummary(mealsState.meals, selectedDateKey, getEffectiveGoals(plan));
  const sections = groupMealsByType(summary.meals);
  const summaryText = formatDailySummaryText(summary);
  const relativeLabel = getRelativeDayLabel(selectedDateKey, todayKey);
  const longDate = formatLongDate(selectedDateKey, todayKey);
  const isBusy = mealsState.pendingAction !== null;

  const refreshError =
    (mealsResource.status === 'ready' ? mealsResource.refreshError : null) ??
    (planResource.status === 'ready' ? planResource.refreshError : null);

  const retryAll = () => {
    mealsState.retry();
    nutritionPlan.retry();
  };

  return (
    <ScrollScreen edges={['top']}>
      <ScreenHeader
        title='MacroZone'
        actions={
          <IconButton
            icon='options-outline'
            onPress={goalsNavigation.openGoals}
            accessibilityLabel='Goals, reminders and appearance'
            accessibilityHint='View or change your daily targets, meal reminders and theme'
          />
        }
      />

      <DateNavigator
        title={relativeLabel ?? longDate}
        subtitle={relativeLabel ? longDate : undefined}
        onPrevious={selectedDate.goToPreviousDay}
        onNext={selectedDate.goToNextDay}
        canGoNext={selectedDate.canGoToNextDay}
        onToday={isToday ? undefined : selectedDate.goToToday}
      />

      <View style={styles.body}>
        {refreshError ? (
          <NoticeCard tone='warning' message={refreshError}>
            <TextButton label='Try again' size='small' onPress={retryAll} />
          </NoticeCard>
        ) : null}

        {mealsResource.status === 'loading' || planResource.status === 'loading' ? (
          mealsResource.status === 'error' || planResource.status === 'error' ? null : (
            <AppLoader accessibilityLabel="Loading today's nutrition" />
          )
        ) : null}

        {mealsResource.status === 'error' ? (
          <ErrorState message={mealsResource.message} onRetry={mealsState.retry} />
        ) : planResource.status === 'error' ? (
          <ErrorState message={planResource.message} onRetry={nutritionPlan.retry} />
        ) : null}

        {mealsResource.status === 'ready' && plan ? (
          <>
            <DailyNutritionSummary progress={summary.goalProgress} />

            <View style={styles.meals}>
              <SectionHeader
                title='Meals'
                detail={summary.meals.length === 1 ? '1 meal logged' : `${summary.meals.length} meals logged`}
                trailing={
                  summary.meals.length > 0 ? (
                    <TextButton
                      label='Clear Day'
                      tone='danger'
                      size='small'
                      disabled={isBusy}
                      onPress={() => void mealsState.requestClearDay(selectedDateKey, todayKey)}
                      accessibilityHint='Deletes every meal logged on this day after confirmation'
                    />
                  ) : null
                }
              />
              {sections.map((section) => (
                <MealSection
                  key={section.mealType}
                  section={section}
                  disabled={isBusy}
                  onAdd={() => mealNavigation.openNewMeal(selectedDateKey, section.mealType)}
                  onPressMeal={(meal) => mealNavigation.openMeal(meal.id)}
                  onRequestDelete={(meal) => void mealsState.requestDeleteMeal(meal)}
                />
              ))}
            </View>

            {shouldOfferGoalPersonalization(plan) ? (
              <PersonalizeGoalsCard
                onSetUp={goalsNavigation.openCalculator}
                onDismiss={() => void nutritionPlan.dismissPersonalization()}
              />
            ) : null}

            <DailySummaryActions summaryText={summaryText} />
          </>
        ) : null}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: spacing.xl,
    gap: spacing.xxl,
  },
  meals: {
    gap: spacing.xl,
  },
});
