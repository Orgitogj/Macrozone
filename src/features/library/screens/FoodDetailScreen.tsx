import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppText } from '@/components/ui/AppText';
import { ErrorState } from '@/components/ui/ErrorState';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { AmountField } from '@/features/library/components/AmountField';
import { FavoriteButton } from '@/features/library/components/FavoriteButton';
import { NutritionPreview } from '@/features/library/components/NutritionPreview';
import { SERVING_UNIT_LABELS } from '@/features/library/constants';
import { useLibraryNavigation } from '@/features/library/hooks/useLibraryNavigation';
import { useLibraryResource } from '@/features/library/hooks/useLibraryResource';
import { getLibraryErrorMessage, getLibraryService } from '@/features/library/services/libraryActions';
import type { Food } from '@/features/library/types';
import { describeFoodRow } from '@/features/library/utils/libraryRowText';
import { calculateLoggedPortionNutrition } from '@/features/library/utils/nutritionMath';
import { formatServingAmount } from '@/features/library/utils/servingFormat';
import { parsePortionAmount, validatePortionForEntry } from '@/features/library/validation/portions';
import { LogDestinationFields } from '@/features/meals/components/LogDestinationFields';
import { useMealNavigation } from '@/features/meals/hooks/useMealNavigation';
import { getDiaryLogService } from '@/features/meals/services/diaryLogActions';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { useTodayDateKey } from '@/hooks/useTodayDateKey';
import { spacing } from '@/theme';
import { resolveLoadSuccess } from '@/utils/asyncResource';
import { formatNumberForInput } from '@/utils/numberInput';
import { createSingleFlight } from '@/utils/singleFlight';

type FoodDetailScreenProps = {
  foodId: string | null;
  initialDestination: LogDestination;
  initialAmount: number | null;
};

type BusyAction = 'log' | 'favorite' | 'delete';

export function FoodDetailScreen({ foodId, initialDestination, initialAmount }: FoodDetailScreenProps) {
  const todayKey = useTodayDateKey();
  const libraryNavigation = useLibraryNavigation();
  const mealNavigation = useMealNavigation();
  const load = useCallback(() => (foodId ? getLibraryService().getFood(foodId) : Promise.resolve(null)), [foodId]);
  const { resource, retry, setResource } = useLibraryResource(load, 'Could not load this food.');
  const [destination, setDestination] = useState(initialDestination);
  const [amountText, setAmountText] = useState<string | null>(initialAmount === null ? null : formatNumberForInput(initialAmount));
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const [actionFlight] = useState(createSingleFlight);

  if (resource.status === 'loading') {
    return (
      <ScrollScreen edges={['bottom']}>
        <AppLoader accessibilityLabel='Loading food' />
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
  const food = resource.data;
  if (food === null) {
    return (
      <ScrollScreen edges={['bottom']}>
        <ErrorState message='This food no longer exists.' onRetry={libraryNavigation.goBack} retryLabel='Go back' />
      </ScrollScreen>
    );
  }

  const text = amountText ?? formatNumberForInput(food.serving.amount);
  const amount = parsePortionAmount(text, food.serving);
  const limitError = amount.ok ? validatePortionForEntry({ ...food, amount: amount.value }) : null;
  const preview = amount.ok && limitError === null ? calculateLoggedPortionNutrition({ ...food, amount: amount.value }) : null;
  const amountError = amount.ok ? (limitError ?? undefined) : amount.error;
  const rowText = describeFoodRow(food);
  const unit = SERVING_UNIT_LABELS[food.serving.unit];

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
      if (!amount.ok || limitError) {
        setMessage(amountError ?? 'Enter a valid amount.');
        return;
      }
      const result = await getDiaryLogService().logFood(food, amount.value, destination, todayKey);
      if (result.status === 'logged') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        mealNavigation.showDay(destination.date);
      } else {
        setMessage(result.message);
      }
    });

  const handleFavorite = () =>
    run('favorite', async () => {
      try {
        const updated: Food = await getLibraryService().setFavorite(food.id, !food.isFavorite);
        setResource((current) => resolveLoadSuccess(current, updated));
      } catch (error) {
        setMessage(getLibraryErrorMessage(error, 'Could not update favorites. Please try again.'));
      }
    });

  const handleDelete = () =>
    run('delete', async () => {
      const result = await getLibraryService().deleteFood(food);
      if (result.status === 'deleted') {
        libraryNavigation.goBack();
      } else if (result.status === 'failed') {
        setMessage(result.message);
      }
    });

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        <AppCard style={styles.summary}>
          <View style={styles.titleRow}>
            <AppText variant='heading' accessibilityRole='header' style={styles.title}>
              {food.name}
            </AppText>
            <FavoriteButton
              name={food.name}
              isFavorite={food.isFavorite}
              onToggle={() => void handleFavorite()}
              disabled={busy !== null}
            />
          </View>
          <AppText variant='body' tone='secondary'>
            {`${rowText.detail} per ${formatServingAmount(food.serving.amount, food.serving.unit)}`}
          </AppText>
          <AppText variant='caption' tone='secondary'>
            {rowText.subtitle}
          </AppText>
        </AppCard>

        <AmountField
          label='Amount'
          value={text}
          onChange={setAmountText}
          suffix={unit.short}
          error={amountError}
          disabled={busy !== null}
          accessibilityLabel={`Amount in ${unit.plural}`}
          quickAmounts={[0.5, 1, 2].map((multiplier) => ({
            label: `${multiplier === 0.5 ? '½' : multiplier}× serving`,
            value: food.serving.amount * multiplier,
            accessibilityLabel: `Set amount to ${formatServingAmount(food.serving.amount * multiplier, food.serving.unit)}`,
          }))}
        />

        <NutritionPreview title="You'll add" nutrition={preview} />

        <LogDestinationFields destination={destination} todayKey={todayKey} onChange={setDestination} disabled={busy !== null} />

        {message ? <NoticeCard tone='danger' message={message} /> : null}

        <AppButton label='Add to Diary' onPress={() => void handleLog()} loading={busy === 'log'} disabled={busy !== null && busy !== 'log'} />

        <View style={styles.secondary}>
          <AppButton
            label='Edit Food'
            variant='secondary'
            onPress={() => libraryNavigation.editFood(food.id, destination)}
            disabled={busy !== null}
            accessibilityHint='Changes this food for future use. Logged meals are not changed.'
          />
          <AppButton
            label='Delete Food'
            variant='danger'
            onPress={() => void handleDelete()}
            loading={busy === 'delete'}
            disabled={busy !== null && busy !== 'delete'}
            accessibilityHint='Deletes this food after confirmation. Logged meals are not changed.'
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
  summary: {
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  secondary: {
    gap: spacing.md,
  },
});
