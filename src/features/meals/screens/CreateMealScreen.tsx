import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppLoader } from '@/components/ui/AppLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { MealForm } from '@/features/meals/components/MealForm';
import { useMeal } from '@/features/meals/hooks/useMeal';
import { useMealForm } from '@/features/meals/hooks/useMealForm';
import { useMealNavigation } from '@/features/meals/hooks/useMealNavigation';
import { saveNewMeal } from '@/features/meals/services/mealActions';
import type { MealType } from '@/features/meals/types';
import { createDuplicateFormValues, createEmptyMealFormValues } from '@/features/meals/validation/mealForm';
import { getTodayDateKey, type LocalDateKey } from '@/utils/date';

type CreateMealScreenProps = {
  title?: string;
  duplicateOfId?: string;
  presetDate?: LocalDateKey | null;
  presetMealType?: MealType | null;
  headerAccessory?: ReactNode;
};

export function CreateMealScreen({
  title,
  duplicateOfId,
  presetDate = null,
  presetMealType = null,
  headerAccessory = null,
}: CreateMealScreenProps) {
  const navigation = useMealNavigation();
  const preset = { date: presetDate, mealType: presetMealType };
  const form = useMealForm(createEmptyMealFormValues(new Date(), preset));
  const { state: sourceState, reload: reloadSource } = useMeal(duplicateOfId);
  const [prefilledFromId, setPrefilledFromId] = useState<string | null>(null);

  const isDuplicate = duplicateOfId !== undefined;
  const hasPreset = presetDate !== null || presetMealType !== null;
  const { isDirty, isSaving, reset } = form;
  const edges = title ? (['top'] as const) : (['bottom'] as const);

  useEffect(() => {
    if (isDuplicate && sourceState.status === 'ready' && prefilledFromId !== sourceState.meal.id) {
      reset(createDuplicateFormValues(sourceState.meal, getTodayDateKey()));
      setPrefilledFromId(sourceState.meal.id);
    }
  }, [isDuplicate, sourceState, prefilledFromId, reset]);

  const canRefreshOnFocus = useRef(false);
  useEffect(() => {
    canRefreshOnFocus.current = !isDuplicate && !hasPreset && !isDirty && !isSaving;
  }, [isDuplicate, hasPreset, isDirty, isSaving]);

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
      reset(createEmptyMealFormValues(new Date(), hasPreset ? preset : {}));
    }
    navigation.showDay(result.meal.date);
  };

  const header = (
    <>
      {title ? <ScreenHeader title={title} subtitle='Log what you ate' /> : null}
      {headerAccessory}
    </>
  );

  if (isDuplicate && sourceState.status !== 'ready') {
    return (
      <ScrollScreen edges={edges}>
        {header}
        {sourceState.status === 'loading' ? <AppLoader accessibilityLabel='Loading meal' /> : null}
        {sourceState.status === 'missing' ? (
          <ErrorState message='This meal no longer exists.' onRetry={navigation.goBack} retryLabel='Go back' />
        ) : null}
        {sourceState.status === 'error' ? <ErrorState message={sourceState.message} onRetry={reloadSource} /> : null}
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen edges={edges}>
      {header}
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
    </ScrollScreen>
  );
}
