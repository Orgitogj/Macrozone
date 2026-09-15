import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormField } from '@/components/ui/FormField';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { FoodPickerModal } from '@/features/library/components/FoodPickerModal';
import { NutritionPreview } from '@/features/library/components/NutritionPreview';
import { PortionListEditor } from '@/features/library/components/PortionListEditor';
import { LIBRARY_LIMITS } from '@/features/library/constants';
import { useLibraryNavigation } from '@/features/library/hooks/useLibraryNavigation';
import { useLibraryResource } from '@/features/library/hooks/useLibraryResource';
import { usePortionDrafts } from '@/features/library/hooks/usePortionDrafts';
import { getLibraryService } from '@/features/library/services/libraryActions';
import { calculateSavedMealNutrition } from '@/features/library/utils/nutritionMath';
import {
  savedMealToFormValues,
  validateSavedMealForm,
  type CollectionFormErrors,
} from '@/features/library/validation/collectionForms';
import { validatePortionDrafts } from '@/features/library/validation/portions';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { spacing } from '@/theme';
import { createSingleFlight } from '@/utils/singleFlight';

type SavedMealFormScreenProps = {
  savedMealId: string | null;
  mode: 'create' | 'edit';
  destination: LogDestination;
};

const NO_ERRORS: CollectionFormErrors = { itemErrors: {} };

export function SavedMealFormScreen({ savedMealId, mode, destination }: SavedMealFormScreenProps) {
  const navigation = useLibraryNavigation();
  const load = useCallback(
    () => (mode === 'edit' && savedMealId ? getLibraryService().getSavedMeal(savedMealId) : Promise.resolve(null)),
    [mode, savedMealId],
  );
  const { resource, retry } = useLibraryResource(load, 'Could not load this saved meal.');
  const [name, setName] = useState('');
  const drafts = usePortionDrafts();
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<CollectionFormErrors>(NO_ERRORS);
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveFlight] = useState(createSingleFlight);
  const { setItems } = drafts;

  const loaded = resource.status === 'ready' ? resource.data : null;
  useEffect(() => {
    if (loaded && loadedId !== loaded.id) {
      const values = savedMealToFormValues(loaded);
      setName(values.name);
      setItems(values.items);
      setLoadedId(loaded.id);
    }
  }, [loaded, loadedId, setItems]);

  const values = { name, items: drafts.items };
  useEffect(() => {
    if (submitted) {
      const validation = validateSavedMealForm({ name, items: drafts.items });
      setErrors(validation.ok ? NO_ERRORS : validation.errors);
    }
  }, [submitted, name, drafts.items]);

  if (mode === 'edit') {
    if (resource.status === 'loading' || (loaded && loadedId !== loaded.id)) {
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
    if (!loaded) {
      return (
        <ScrollScreen edges={['bottom']}>
          <ErrorState message='This saved meal no longer exists.' onRetry={navigation.goBack} retryLabel='Go back' />
        </ScrollScreen>
      );
    }
  }

  const portions = validatePortionDrafts(drafts.items, { checkEntryLimits: true });
  const total = portions.ok && portions.portions.length > 0 ? calculateSavedMealNutrition(portions.portions) : null;

  const handleSave = () =>
    saveFlight.run(async () => {
      setSubmitted(true);
      setIsSaving(true);
      setSaveError(null);
      try {
        const result = await getLibraryService().saveSavedMeal(values, mode === 'edit' ? savedMealId : null);
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
          navigation.replaceWithSavedMeal(result.value.id, destination);
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
          <NoticeCard message='Changes apply the next time you add this saved meal. Meals you already logged are not changed.' />
        ) : null}
        <FormField label='Name' error={errors.name}>
          <AppTextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              setSaveError(null);
            }}
            placeholder='e.g. Post-workout meal'
            maxLength={LIBRARY_LIMITS.nameMaxLength}
            hasError={Boolean(errors.name)}
            editable={!isSaving}
            accessibilityLabel='Saved meal name'
            accessibilityHint={errors.name}
          />
        </FormField>

        <PortionListEditor
          title='Foods'
          items={drafts.items}
          itemErrors={errors.itemErrors}
          listError={errors.items}
          addLabel='Add Food'
          disabled={isSaving}
          onChangeAmount={drafts.changeAmount}
          onRemove={drafts.remove}
          onAdd={() => setPickerOpen(true)}
        />

        <NutritionPreview
          title='Total'
          nutrition={total}
          unavailableMessage='Add foods with valid amounts to see the total.'
          caption={drafts.items.length === 1 ? '1 food' : `${drafts.items.length} foods`}
        />

        {saveError ? <NoticeCard tone='danger' message={saveError} /> : null}
        <AppButton label={mode === 'edit' ? 'Save Changes' : 'Create Saved Meal'} onPress={() => void handleSave()} loading={isSaving} />
      </View>
      <FoodPickerModal
        visible={pickerOpen}
        title='Add a food'
        onClose={() => setPickerOpen(false)}
        onSelect={(food) => {
          drafts.add(food);
          setPickerOpen(false);
        }}
      />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
});
