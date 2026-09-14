import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/layout/FormScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppLoader } from '@/components/ui/AppLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { MealForm } from '@/features/meals/components/MealForm';
import { useMeal } from '@/features/meals/hooks/useMeal';
import { useMealForm } from '@/features/meals/hooks/useMealForm';
import { useMealNavigation } from '@/features/meals/hooks/useMealNavigation';
import {
  confirmAndDeleteMeal,
  getMealErrorMessage,
} from '@/features/meals/services/mealActions';
import { updateMeal } from '@/features/meals/storage/mealStorage';
import type { Meal, MealInput } from '@/features/meals/types';
import {
  createEmptyMealFormValues,
  mealToFormValues,
} from '@/features/meals/validation/mealForm';
import { createSingleFlight } from '@/utils/singleFlight';

type EditMealScreenProps = {
  mealId: string | undefined;
};

export function EditMealScreen({ mealId }: EditMealScreenProps) {
  const navigation = useMealNavigation();
  const { state, reload } = useMeal(mealId);
  const form = useMealForm(createEmptyMealFormValues(new Date()));
  const [loadedMeal, setLoadedMeal] = useState<Meal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFlight] = useState(createSingleFlight);
  const { reset } = form;

  useEffect(() => {
    if (state.status === 'ready' && loadedMeal?.id !== state.meal.id) {
      reset(mealToFormValues(state.meal));
      setLoadedMeal(state.meal);
    }
  }, [state, loadedMeal, reset]);

  if (state.status !== 'ready' || loadedMeal === null) {
    return (
      <FormScreen>
        {state.status === 'loading' || state.status === 'ready' ? (
          <AppLoader accessibilityLabel='Loading meal' />
        ) : null}
        {state.status === 'missing' ? (
          <ErrorState message='This meal no longer exists.' onRetry={navigation.goBack} retryLabel='Go back' />
        ) : null}
        {state.status === 'error' ? <ErrorState message={state.message} onRetry={reload} /> : null}
      </FormScreen>
    );
  }

  const meal = loadedMeal;
  const isBusy = form.isSaving || isDeleting;

  const handleSave = async () => {
    const result = await form.submit((input: MealInput) => updateMeal(meal.id, input));
    if (result?.status === 'saved') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    }
  };

  const handleDelete = () =>
    deleteFlight.run(async () => {
      setIsDeleting(true);
      try {
        if ((await confirmAndDeleteMeal(meal)) === 'completed') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          navigation.goBack();
        }
      } catch (error) {
        Alert.alert('Error', getMealErrorMessage(error, 'Could not delete the meal. Please try again.'));
      } finally {
        setIsDeleting(false);
      }
    });

  return (
    <FormScreen>
      <MealForm
        values={form.values}
        errors={form.errors}
        todayKey={form.todayKey}
        isSaving={form.isSaving}
        saveError={form.saveError}
        submitLabel='Save Changes'
        onChange={form.setField}
        onBlur={form.markTouched}
        onSubmit={handleSave}
        footer={
          <View style={styles.actions}>
            <AppButton
              label='Duplicate'
              variant='secondary'
              onPress={() => navigation.openDuplicate(meal.id)}
              disabled={isBusy}
              accessibilityHint='Opens a new meal form prefilled with this meal'
            />
            <AppButton
              label='Delete Meal'
              variant='danger'
              onPress={handleDelete}
              loading={isDeleting}
              disabled={form.isSaving}
              accessibilityHint='Deletes this meal after confirmation'
            />
          </View>
        }
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
  },
});
