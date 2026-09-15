import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppText } from '@/components/ui/AppText';
import { ErrorState } from '@/components/ui/ErrorState';
import { KeyValueRow } from '@/components/ui/KeyValueRow';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { NutritionPreview } from '@/features/library/components/NutritionPreview';
import { useLibraryNavigation } from '@/features/library/hooks/useLibraryNavigation';
import { useLibraryResource } from '@/features/library/hooks/useLibraryResource';
import { getLibraryErrorMessage, getLibraryService } from '@/features/library/services/libraryActions';
import { calculateLoggedPortionNutrition, calculateSavedMealNutrition } from '@/features/library/utils/nutritionMath';
import { formatServingAmount } from '@/features/library/utils/servingFormat';
import { LogDestinationFields } from '@/features/meals/components/LogDestinationFields';
import { useMealNavigation } from '@/features/meals/hooks/useMealNavigation';
import { getDiaryLogService } from '@/features/meals/services/diaryLogActions';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { useTodayDateKey } from '@/hooks/useTodayDateKey';
import { spacing } from '@/theme';
import { formatCalories } from '@/utils/format';
import { createSingleFlight } from '@/utils/singleFlight';

type SavedMealDetailScreenProps = {
  savedMealId: string | null;
  initialDestination: LogDestination;
};

type BusyAction = 'log' | 'duplicate' | 'delete';

export function SavedMealDetailScreen({ savedMealId, initialDestination }: SavedMealDetailScreenProps) {
  const todayKey = useTodayDateKey();
  const libraryNavigation = useLibraryNavigation();
  const mealNavigation = useMealNavigation();
  const load = useCallback(
    () => (savedMealId ? getLibraryService().getSavedMeal(savedMealId) : Promise.resolve(null)),
    [savedMealId],
  );
  const { resource, retry } = useLibraryResource(load, 'Could not load this saved meal.');
  const [destination, setDestination] = useState(initialDestination);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const [actionFlight] = useState(createSingleFlight);

  if (resource.status === 'loading') {
    return (
      <ScrollScreen edges={['bottom']}>
        <AppLoader accessibilityLabel='Loading saved meal' />
      </ScrollScreen>
    );
  }
  if (resource.status === 'error') {
    return (
      <ScrollScreen edges={['bottom']}>
        <ErrorState message={resource.message} onRetry={retry} />
      </ScrollScreen>
    );
  }
  const savedMeal = resource.data;
  if (savedMeal === null) {
    return (
      <ScrollScreen edges={['bottom']}>
        <ErrorState message='This saved meal no longer exists.' onRetry={libraryNavigation.goBack} retryLabel='Go back' />
      </ScrollScreen>
    );
  }

  const total = calculateSavedMealNutrition(savedMeal.items);
  const itemCount = savedMeal.items.length;

  const run = (action: BusyAction, task: () => Promise<void>) =>
    actionFlight.run(async () => {
      setBusy(action);
      setMessage(null);
      try {
        await task();
      } finally {
        setBusy(null);
      }
    });

  const handleLog = () =>
    run('log', async () => {
      const result = await getDiaryLogService().logSavedMeal(savedMeal, destination, todayKey);
      if (result.status === 'logged') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        mealNavigation.showDay(destination.date);
      } else {
        setMessage(result.message);
      }
    });

  const handleDuplicate = () =>
    run('duplicate', async () => {
      try {
        const copy = await getLibraryService().duplicateSavedMeal(savedMeal);
        libraryNavigation.replaceWithSavedMeal(copy.id, destination);
      } catch (error) {
        setMessage(getLibraryErrorMessage(error, 'Could not duplicate this saved meal. Please try again.'));
      }
    });

  const handleDelete = () =>
    run('delete', async () => {
      const result = await getLibraryService().deleteSavedMeal(savedMeal);
      if (result.status === 'deleted') {
        libraryNavigation.goBack();
      } else if (result.status === 'failed') {
        setMessage(result.message);
      }
    });

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        <AppText variant='title' accessibilityRole='header'>
          {savedMeal.name}
        </AppText>

        <AppCard style={styles.items}>
          <AppText variant='subheading' accessibilityRole='header'>
            {itemCount === 1 ? '1 food' : `${itemCount} foods`}
          </AppText>
          {savedMeal.items.map((item) => (
            <KeyValueRow
              key={item.id}
              label={`${item.foodName} · ${formatServingAmount(item.amount, item.serving.unit)}`}
              value={`${formatCalories(calculateLoggedPortionNutrition(item).calories)} kcal`}
            />
          ))}
        </AppCard>

        <NutritionPreview title="You'll add" nutrition={total} caption='Each food is added as its own diary entry.' />

        <LogDestinationFields destination={destination} todayKey={todayKey} onChange={setDestination} disabled={busy !== null} />

        {message ? <NoticeCard tone='danger' message={message} /> : null}

        <AppButton
          label={itemCount === 1 ? 'Add 1 Food to Diary' : `Add ${itemCount} Foods to Diary`}
          onPress={() => void handleLog()}
          loading={busy === 'log'}
          disabled={busy !== null && busy !== 'log'}
        />

        <View style={styles.secondary}>
          <AppButton
            label='Edit Saved Meal'
            variant='secondary'
            onPress={() => libraryNavigation.editSavedMeal(savedMeal.id, destination)}
            disabled={busy !== null}
          />
          <AppButton
            label='Duplicate'
            variant='secondary'
            onPress={() => void handleDuplicate()}
            loading={busy === 'duplicate'}
            disabled={busy !== null && busy !== 'duplicate'}
            accessibilityHint='Creates a copy of this saved meal'
          />
          <AppButton
            label='Delete Saved Meal'
            variant='danger'
            onPress={() => void handleDelete()}
            loading={busy === 'delete'}
            disabled={busy !== null && busy !== 'delete'}
            accessibilityHint='Deletes this saved meal after confirmation. Logged meals are not changed.'
          />
        </View>
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
  items: {
    gap: spacing.sm,
  },
  secondary: {
    gap: spacing.md,
  },
});
