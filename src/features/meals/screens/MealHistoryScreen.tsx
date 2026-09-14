import { Screen } from '@/components/layout/Screen';
import { AppLoader } from '@/components/ui/AppLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextButton } from '@/components/ui/TextButton';
import { MealHistoryList } from '@/features/meals/components/MealHistoryList';
import { useMealNavigation } from '@/features/meals/hooks/useMealNavigation';
import { useMeals } from '@/features/meals/hooks/useMeals';
import { groupMealsByDate } from '@/features/meals/utils/mealDates';
import { useTodayDateKey } from '@/hooks/useTodayDateKey';

export function MealHistoryScreen() {
  const mealsState = useMeals();
  const todayKey = useTodayDateKey();
  const navigation = useMealNavigation();
  const { resource } = mealsState;

  const header = <ScreenHeader title='Diary' subtitle='Your meal history by day' />;

  return (
    <Screen edges={['top']}>
      {resource.status === 'loading' ? (
        <>
          {header}
          <AppLoader accessibilityLabel='Loading your diary' />
        </>
      ) : null}

      {resource.status === 'error' ? (
        <>
          {header}
          <ErrorState message={resource.message} onRetry={mealsState.retry} />
        </>
      ) : null}

      {resource.status === 'ready' ? (
        <MealHistoryList
          groups={groupMealsByDate(resource.data)}
          todayKey={todayKey}
          disabled={mealsState.pendingAction !== null}
          header={
            resource.refreshError ? (
              <>
                {header}
                <NoticeCard tone='warning' message={resource.refreshError}>
                  <TextButton label='Try again' size='small' onPress={mealsState.retry} />
                </NoticeCard>
              </>
            ) : (
              header
            )
          }
          onPressMeal={(meal) => navigation.openMeal(meal.id)}
          onRequestDelete={(meal) => void mealsState.requestDeleteMeal(meal)}
          onClearDay={(dateKey) => void mealsState.requestClearDay(dateKey, todayKey)}
          onDeleteAll={() => void mealsState.requestDeleteAllHistory()}
        />
      ) : null}
    </Screen>
  );
}
