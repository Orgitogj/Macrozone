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
import { AmountField } from '@/features/library/components/AmountField';
import { NutritionPreview } from '@/features/library/components/NutritionPreview';
import { useLibraryNavigation } from '@/features/library/hooks/useLibraryNavigation';
import { useLibraryResource } from '@/features/library/hooks/useLibraryResource';
import { getLibraryErrorMessage, getLibraryService } from '@/features/library/services/libraryActions';
import {
  calculateLoggedPortionNutrition,
  calculateLoggedRecipeNutrition,
  calculateRecipeNutrition,
  exceedsDiaryEntryLimits,
} from '@/features/library/utils/nutritionMath';
import { formatAmount, formatServingAmount } from '@/features/library/utils/servingFormat';
import { ENTRY_LIMIT_MESSAGE, parseLoggedServings } from '@/features/library/validation/portions';
import { LogDestinationFields } from '@/features/meals/components/LogDestinationFields';
import { useMealNavigation } from '@/features/meals/hooks/useMealNavigation';
import { getDiaryLogService } from '@/features/meals/services/diaryLogActions';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { useTodayDateKey } from '@/hooks/useTodayDateKey';
import { spacing } from '@/theme';
import { formatCalories } from '@/utils/format';
import { createSingleFlight } from '@/utils/singleFlight';

type RecipeDetailScreenProps = {
  recipeId: string | null;
  initialDestination: LogDestination;
};

type BusyAction = 'log' | 'duplicate' | 'delete';

export function RecipeDetailScreen({ recipeId, initialDestination }: RecipeDetailScreenProps) {
  const todayKey = useTodayDateKey();
  const libraryNavigation = useLibraryNavigation();
  const mealNavigation = useMealNavigation();
  const load = useCallback(() => (recipeId ? getLibraryService().getRecipe(recipeId) : Promise.resolve(null)), [recipeId]);
  const { resource, retry } = useLibraryResource(load, 'Could not load this recipe.');
  const [destination, setDestination] = useState(initialDestination);
  const [servingsText, setServingsText] = useState('1');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const [actionFlight] = useState(createSingleFlight);

  if (resource.status === 'loading') {
    return (
      <ScrollScreen edges={['bottom']}>
        <AppLoader accessibilityLabel='Loading recipe' />
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
  const recipe = resource.data;
  if (recipe === null) {
    return (
      <ScrollScreen edges={['bottom']}>
        <ErrorState message='This recipe no longer exists.' onRetry={libraryNavigation.goBack} retryLabel='Go back' />
      </ScrollScreen>
    );
  }

  const nutrition = calculateRecipeNutrition(recipe);
  const servings = parseLoggedServings(servingsText);
  const logged = servings.ok ? calculateLoggedRecipeNutrition(recipe, servings.value) : null;
  const limitError = logged && exceedsDiaryEntryLimits(logged) ? ENTRY_LIMIT_MESSAGE : null;
  const servingsError = servings.ok ? (limitError ?? undefined) : servings.error;

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
      if (!servings.ok || limitError) {
        setMessage(servingsError ?? 'Enter a valid number of servings.');
        return;
      }
      const result = await getDiaryLogService().logRecipe(recipe, servings.value, destination, todayKey);
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
        const copy = await getLibraryService().duplicateRecipe(recipe);
        libraryNavigation.replaceWithRecipe(copy.id, destination);
      } catch (error) {
        setMessage(getLibraryErrorMessage(error, 'Could not duplicate this recipe. Please try again.'));
      }
    });

  const handleDelete = () =>
    run('delete', async () => {
      const result = await getLibraryService().deleteRecipe(recipe);
      if (result.status === 'deleted') {
        libraryNavigation.goBack();
      } else if (result.status === 'failed') {
        setMessage(result.message);
      }
    });

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <AppText variant='title' accessibilityRole='header'>
            {recipe.name}
          </AppText>
          <AppText variant='body' tone='secondary'>
            {`Makes ${formatAmount(recipe.servings)} ${recipe.servings === 1 ? 'serving' : 'servings'}`}
          </AppText>
        </View>

        <AppCard style={styles.items}>
          <AppText variant='subheading' accessibilityRole='header'>
            Ingredients
          </AppText>
          {recipe.ingredients.map((ingredient) => (
            <KeyValueRow
              key={ingredient.id}
              label={`${ingredient.foodName} · ${formatServingAmount(ingredient.amount, ingredient.serving.unit)}`}
              value={`${formatCalories(calculateLoggedPortionNutrition(ingredient).calories)} kcal`}
            />
          ))}
        </AppCard>

        <NutritionPreview title='Whole recipe' nutrition={nutrition.total} />
        <NutritionPreview title='Per serving' nutrition={nutrition.perServing} />

        <AmountField
          label='Servings to add'
          value={servingsText}
          onChange={setServingsText}
          suffix='servings'
          error={servingsError}
          disabled={busy !== null}
          accessibilityLabel='Number of servings to add'
          quickAmounts={[0.5, 1, 2].map((value) => ({
            label: `${value === 0.5 ? '½' : value} serving${value === 2 ? 's' : ''}`,
            value,
            accessibilityLabel: `Set servings to ${formatAmount(value)}`,
          }))}
        />

        <NutritionPreview title="You'll add" nutrition={limitError ? null : logged} />

        <LogDestinationFields destination={destination} todayKey={todayKey} onChange={setDestination} disabled={busy !== null} />

        {message ? <NoticeCard tone='danger' message={message} /> : null}

        <AppButton label='Add to Diary' onPress={() => void handleLog()} loading={busy === 'log'} disabled={busy !== null && busy !== 'log'} />

        <View style={styles.secondary}>
          <AppButton
            label='Edit Recipe'
            variant='secondary'
            onPress={() => libraryNavigation.editRecipe(recipe.id, destination)}
            disabled={busy !== null}
          />
          <AppButton
            label='Duplicate'
            variant='secondary'
            onPress={() => void handleDuplicate()}
            loading={busy === 'duplicate'}
            disabled={busy !== null && busy !== 'duplicate'}
            accessibilityHint='Creates a copy of this recipe'
          />
          <AppButton
            label='Delete Recipe'
            variant='danger'
            onPress={() => void handleDelete()}
            loading={busy === 'delete'}
            disabled={busy !== null && busy !== 'delete'}
            accessibilityHint='Deletes this recipe after confirmation. Logged meals are not changed.'
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
  header: {
    gap: spacing.xs,
  },
  items: {
    gap: spacing.sm,
  },
  secondary: {
    gap: spacing.md,
  },
});
