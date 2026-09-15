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
import { AmountField } from '@/features/library/components/AmountField';
import { FoodPickerModal } from '@/features/library/components/FoodPickerModal';
import { NutritionPreview } from '@/features/library/components/NutritionPreview';
import { PortionListEditor } from '@/features/library/components/PortionListEditor';
import { LIBRARY_LIMITS } from '@/features/library/constants';
import { useLibraryNavigation } from '@/features/library/hooks/useLibraryNavigation';
import { useLibraryResource } from '@/features/library/hooks/useLibraryResource';
import { usePortionDrafts } from '@/features/library/hooks/usePortionDrafts';
import { getLibraryService } from '@/features/library/services/libraryActions';
import { calculateRecipeNutrition, NutritionCalculationError } from '@/features/library/utils/nutritionMath';
import {
  recipeToFormValues,
  validateRecipeForm,
  type CollectionFormErrors,
} from '@/features/library/validation/collectionForms';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { spacing } from '@/theme';
import { createSingleFlight } from '@/utils/singleFlight';

type RecipeFormScreenProps = {
  recipeId: string | null;
  mode: 'create' | 'edit';
  destination: LogDestination;
};

const NO_ERRORS: CollectionFormErrors = { itemErrors: {} };

export function RecipeFormScreen({ recipeId, mode, destination }: RecipeFormScreenProps) {
  const navigation = useLibraryNavigation();
  const load = useCallback(
    () => (mode === 'edit' && recipeId ? getLibraryService().getRecipe(recipeId) : Promise.resolve(null)),
    [mode, recipeId],
  );
  const { resource, retry } = useLibraryResource(load, 'Could not load this recipe.');
  const [name, setName] = useState('');
  const [servings, setServings] = useState('1');
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
      const values = recipeToFormValues(loaded);
      setName(values.name);
      setServings(values.servings);
      setItems(values.items);
      setLoadedId(loaded.id);
    }
  }, [loaded, loadedId, setItems]);

  const values = { name, servings, items: drafts.items };
  const validation = validateRecipeForm(values);
  useEffect(() => {
    if (submitted) {
      const next = validateRecipeForm({ name, servings, items: drafts.items });
      setErrors(next.ok ? NO_ERRORS : next.errors);
    }
  }, [submitted, name, servings, drafts.items]);

  if (mode === 'edit') {
    if (resource.status === 'loading' || (loaded && loadedId !== loaded.id)) {
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
    if (!loaded) {
      return (
        <ScrollScreen edges={['bottom']}>
          <ErrorState message='This recipe no longer exists.' onRetry={navigation.goBack} retryLabel='Go back' />
        </ScrollScreen>
      );
    }
  }

  let nutrition: ReturnType<typeof calculateRecipeNutrition> | null = null;
  if (validation.ok) {
    try {
      nutrition = calculateRecipeNutrition(validation.input);
    } catch (error) {
      if (!(error instanceof NutritionCalculationError)) {
        throw error;
      }
    }
  }

  const handleSave = () =>
    saveFlight.run(async () => {
      setSubmitted(true);
      setIsSaving(true);
      setSaveError(null);
      try {
        const result = await getLibraryService().saveRecipe(values, mode === 'edit' ? recipeId : null);
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
          navigation.replaceWithRecipe(result.value.id, destination);
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
          <NoticeCard message='Changes apply the next time you log this recipe. Meals you already logged are not changed.' />
        ) : null}
        <FormField label='Recipe name' error={errors.name}>
          <AppTextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              setSaveError(null);
            }}
            placeholder='e.g. Protein pancakes'
            maxLength={LIBRARY_LIMITS.nameMaxLength}
            hasError={Boolean(errors.name)}
            editable={!isSaving}
            accessibilityLabel='Recipe name'
            accessibilityHint={errors.name}
          />
        </FormField>

        <AmountField
          label='Servings this recipe makes'
          value={servings}
          onChange={(text) => {
            setServings(text);
            setSaveError(null);
          }}
          suffix='servings'
          error={errors.servings}
          disabled={isSaving}
          accessibilityLabel='Number of servings this recipe makes'
        />

        <PortionListEditor
          title='Ingredients'
          items={drafts.items}
          itemErrors={errors.itemErrors}
          listError={errors.items}
          addLabel='Add Ingredient'
          disabled={isSaving}
          onChangeAmount={drafts.changeAmount}
          onRemove={drafts.remove}
          onAdd={() => setPickerOpen(true)}
        />

        <NutritionPreview
          title='Whole recipe'
          nutrition={nutrition?.total ?? null}
          unavailableMessage='Add ingredients with valid amounts and servings to see nutrition.'
        />
        <NutritionPreview
          title='Per serving'
          nutrition={nutrition?.perServing ?? null}
          unavailableMessage='Enter a valid number of servings to see nutrition per serving.'
        />

        {saveError ? <NoticeCard tone='danger' message={saveError} /> : null}
        <AppButton label={mode === 'edit' ? 'Save Changes' : 'Create Recipe'} onPress={() => void handleSave()} loading={isSaving} />
      </View>
      <FoodPickerModal
        visible={pickerOpen}
        title='Add an ingredient'
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
