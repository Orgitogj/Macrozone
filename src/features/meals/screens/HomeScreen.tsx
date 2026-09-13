import { ScrollView, Text, View } from 'react-native';

import { AppLoader } from '@/components/ui/AppLoader';
import { DateNavigator } from '@/components/ui/DateNavigator';
import { ErrorState } from '@/components/ui/ErrorState';
import { CopySummaryButton } from '@/features/meals/components/CopySummaryButton';
import { DayMealList } from '@/features/meals/components/DayMealList';
import { MacroGrid } from '@/features/meals/components/MacroGrid';
import { ShareSummaryButton } from '@/features/meals/components/ShareSummaryButton';
import { useMeals } from '@/features/meals/hooks/useMeals';
import {
  buildDailySummary,
  formatDailySummaryText,
} from '@/features/meals/utils/dailySummary';
import { DEFAULT_DAILY_GOALS } from '@/features/nutrition-goals';
import { useSelectedDate } from '@/hooks/useSelectedDate';
import { globalStyles } from '@/styles/global';
import { formatLongDate, getRelativeDayLabel } from '@/utils/date';

export function HomeScreen() {
  const { meals, status, errorMessage, retry, requestDeleteMeal } = useMeals();
  const {
    selectedDateKey,
    todayKey,
    isToday,
    canGoToNextDay,
    goToPreviousDay,
    goToNextDay,
    goToToday,
  } = useSelectedDate();

  const summary = buildDailySummary(meals, selectedDateKey, DEFAULT_DAILY_GOALS);
  const summaryText = formatDailySummaryText(summary);
  const relativeLabel = getRelativeDayLabel(selectedDateKey, todayKey);
  const longDate = formatLongDate(selectedDateKey, todayKey);
  const isReady = status === 'ready';

  return (
    <ScrollView style={globalStyles.container}>
      <View style={globalStyles.header}>
        <Text style={globalStyles.title} accessibilityRole='header'>
          MacroZone
        </Text>
        <ShareSummaryButton summaryText={summaryText} disabled={!isReady} />
      </View>

      <DateNavigator
        title={relativeLabel ?? longDate}
        subtitle={relativeLabel ? longDate : undefined}
        onPrevious={goToPreviousDay}
        onNext={goToNextDay}
        canGoNext={canGoToNextDay}
        onToday={isToday ? undefined : goToToday}
      />

      {status === 'loading' ? <AppLoader accessibilityLabel='Loading meals' /> : null}

      {status === 'error' ? (
        <ErrorState
          message={errorMessage ?? 'Could not load your meals.'}
          onRetry={retry}
        />
      ) : null}

      {isReady ? (
        <>
          <MacroGrid totals={summary.totals} goals={summary.goals} />
          <CopySummaryButton summaryText={summaryText} />
          <DayMealList
            meals={summary.meals}
            emptyMessage={
              isToday ? 'No meals logged today.' : 'No meals logged on this day.'
            }
            onRequestDelete={requestDeleteMeal}
          />
        </>
      ) : null}
    </ScrollView>
  );
}
