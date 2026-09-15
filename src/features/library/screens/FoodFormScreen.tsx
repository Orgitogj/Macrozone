import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppLoader } from '@/components/ui/AppLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { FoodFormFields } from '@/features/library/components/FoodFormFields';
import { useLibraryNavigation } from '@/features/library/hooks/useLibraryNavigation';
import { useLibraryResource } from '@/features/library/hooks/useLibraryResource';
import { getLibraryService } from '@/features/library/services/libraryActions';
import {
  createEmptyFoodFormValues,
  foodToFormValues,
  validateFoodForm,
  type FoodFormErrors,
  type FoodFormField,
  type FoodFormValues,
} from '@/features/library/validation/foodForm';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { spacing } from '@/theme';
import { createSingleFlight } from '@/utils/singleFlight';

type FoodFormScreenProps = {
  foodId: string | null;
  mode: 'create' | 'edit';
  destination: LogDestination;
};

export function FoodFormScreen({ foodId, mode, destination }: FoodFormScreenProps) {
  const navigation = useLibraryNavigation();
  const load = useCallback(
    () => (mode === 'edit' && foodId ? getLibraryService().getFood(foodId) : Promise.resolve(null)),
    [mode, foodId],
  );
  const { resource, retry } = useLibraryResource(load, 'Could not load this food.');
  const [values, setValues] = useState<FoodFormValues>(createEmptyFoodFormValues);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FoodFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFlight] = useState(createSingleFlight);

  const loadedFood = resource.status === 'ready' ? resource.data : null;
  useEffect(() => {
    if (loadedFood && loadedId !== loadedFood.id) {
      setValues(foodToFormValues(loadedFood));
      setLoadedId(loadedFood.id);
    }
  }, [loadedFood, loadedId]);

  if (mode === 'edit') {
    if (resource.status === 'loading' || (loadedFood && loadedId !== loadedFood.id)) {
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
    if (!loadedFood) {
      return (
        <ScrollScreen edges={['bottom']}>
          <ErrorState message='This food no longer exists.' onRetry={navigation.goBack} retryLabel='Go back' />
        </ScrollScreen>
      );
    }
  }

  const setField = <F extends FoodFormField>(field: F, value: FoodFormValues[F]) => {
    const next = { ...values, [field]: value };
    setValues(next);
    if (submitted) {
      const validation = validateFoodForm(next);
      setErrors(validation.ok ? {} : validation.errors);
    }
    setSaveError(null);
  };

  const handleSave = () =>
    saveFlight.run(async () => {
      setSubmitted(true);
      setIsSaving(true);
      try {
        const result = await getLibraryService().saveFood(values, mode === 'edit' ? foodId : null);
        if (result.status === 'invalid') {
          setErrors(result.errors);
          return;
        }
        if (result.status === 'failed') {
          setSaveError(result.message);
          return;
        }
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (mode === 'create') {
          navigation.replaceWithFood(result.value.id, destination);
        } else {
          navigation.goBack();
        }
      } finally {
        setIsSaving(false);
      }
    });

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        {mode === 'edit' ? (
          <NoticeCard message='Changes apply the next time you use this food. Meals you already logged keep their nutrition.' />
        ) : null}
        <FoodFormFields values={values} errors={errors} disabled={isSaving} onChange={setField} />
        {saveError ? <NoticeCard tone='danger' message={saveError} /> : null}
        <AppButton label={mode === 'edit' ? 'Save Changes' : 'Create Food'} onPress={() => void handleSave()} loading={isSaving} />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
});
