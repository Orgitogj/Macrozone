import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AppLoader } from '@/components/ui/AppLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormScreen } from '@/components/layout/FormScreen';
import { MealForm } from '@/features/meals/components/MealForm';
import { useMeal } from '@/features/meals/hooks/useMeal';
import { useMealForm } from '@/features/meals/hooks/useMealForm';
import { useMealNavigation } from '@/features/meals/hooks/useMealNavigation';
import { saveNewMeal } from '@/features/meals/services/mealActions';
import {
  createDuplicateFormValues,
  createEmptyMealFormValues,
} from '@/features/meals/validation/mealForm';
import { getTodayDateKey } from '@/utils/date';

type CreateMealScreenProps = {
  title?: string;
  duplicateOfId?: string;
};

export function CreateMealScreen({ title, duplicateOfId }: CreateMealScreenProps) {
  const navigation = useMealNavigation();
  const form = useMealForm(createEmptyMealFormValues(new Date()));
  const { state: sourceState, reload: reloadSource } = useMeal(duplicateOfId);
  const [prefilledFromId, setPrefilledFromId] = useState<string | null>(null);

  const isDuplicate = duplicateOfId !== undefined;
  const { isDirty, isSaving, reset } = form;

  useEffect(() => {
    if (isDuplicate && sourceState.status === 'ready' && prefilledFromId !== sourceState.meal.id) {
      reset(createDuplicateFormValues(sourceState.meal, getTodayDateKey()));
      setPrefilledFromId(sourceState.meal.id);
    }
  }, [isDuplicate, sourceState, prefilledFromId, reset]);

  const canRefreshOnFocus = useRef(false);
  useEffect(() => {
    canRefreshOnFocus.current = !isDuplicate && !isDirty && !isSaving;
  }, [isDuplicate, isDirty, isSaving]);

  useFocusEffect(
    useCallback(() => {
      if (canRefreshOnFocus.current) {
        reset(createEmptyMealFormValues(new Date()));
      }
    }, [reset]),
  );

  const handleSubmit = async () => {
    const result = await form.submit((input) => saveNewMeal(input));
    if (result?.status !== 'saved') {
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!isDuplicate) {
      reset(createEmptyMealFormValues(new Date()));
    }
    navigation.showDay(result.meal.date);
  };

  if (isDuplicate && sourceState.status !== 'ready') {
    return (
      <FormScreen title={title}>
        {sourceState.status === 'loading' ? <AppLoader accessibilityLabel='Loading meal' /> : null}
        {sourceState.status === 'missing' ? (
          <ErrorState message='This meal no longer exists.' onRetry={navigation.goBack} retryLabel='Go back' />
        ) : null}
        {sourceState.status === 'error' ? (
          <ErrorState message={sourceState.message} onRetry={reloadSource} />
        ) : null}
      </FormScreen>
    );
  }

  return (
    <FormScreen title={title}>
      <MealForm
        values={form.values}
        errors={form.errors}
        todayKey={form.todayKey}
        isSaving={form.isSaving}
        saveError={form.saveError}
        submitLabel={isDuplicate ? 'Add Copy' : 'Add Meal'}
        onChange={form.setField}
        onBlur={form.markTouched}
        onSubmit={handleSubmit}
      />
    </FormScreen>
  );
}
