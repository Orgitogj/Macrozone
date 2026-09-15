import { StyleSheet, View } from 'react-native';

import { AppTextInput } from '@/components/ui/AppTextInput';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { FormField } from '@/components/ui/FormField';
import { LIBRARY_LIMITS, SERVING_UNIT_LABELS, SERVING_UNITS } from '@/features/library/constants';
import type { FoodFormErrors, FoodFormField, FoodFormValues } from '@/features/library/validation/foodForm';
import { spacing } from '@/theme';

type FoodFormFieldsProps = {
  values: FoodFormValues;
  errors: FoodFormErrors;
  disabled: boolean;
  onChange: <F extends FoodFormField>(field: F, value: FoodFormValues[F]) => void;
};

const UNIT_OPTIONS = SERVING_UNITS.map((unit) => ({
  value: unit,
  label: SERVING_UNIT_LABELS[unit].short,
  accessibilityLabel: SERVING_UNIT_LABELS[unit].plural,
}));

const MACROS = [
  { field: 'protein', label: 'Protein' },
  { field: 'carbs', label: 'Carbs' },
  { field: 'fat', label: 'Fat' },
] as const;

export function FoodFormFields({ values, errors, disabled, onChange }: FoodFormFieldsProps) {
  const unitLabel = SERVING_UNIT_LABELS[values.servingUnit].short;

  return (
    <View style={styles.form}>
      <FormField label='Food name' error={errors.name}>
        <AppTextInput
          value={values.name}
          onChangeText={(text) => onChange('name', text)}
          placeholder='e.g. Greek yogurt'
          maxLength={LIBRARY_LIMITS.nameMaxLength}
          autoCapitalize='sentences'
          hasError={Boolean(errors.name)}
          editable={!disabled}
          accessibilityLabel='Food name'
          accessibilityHint={errors.name}
        />
      </FormField>

      <FormField label='Serving unit' error={errors.servingUnit}>
        <ChipGroup
          options={UNIT_OPTIONS}
          value={values.servingUnit}
          onChange={(unit) => onChange('servingUnit', unit)}
          accessibilityLabel='Serving unit'
          disabled={disabled}
        />
      </FormField>

      <FormField label='Serving size' error={errors.servingAmount} hint='Nutrition below is for this amount.'>
        <AppTextInput
          value={values.servingAmount}
          onChangeText={(text) => onChange('servingAmount', text)}
          keyboardType='decimal-pad'
          suffix={unitLabel}
          hasError={Boolean(errors.servingAmount)}
          editable={!disabled}
          accessibilityLabel={`Serving size in ${SERVING_UNIT_LABELS[values.servingUnit].plural}`}
          accessibilityHint={errors.servingAmount}
        />
      </FormField>

      <FormField label='Calories per serving (kcal)' error={errors.calories}>
        <AppTextInput
          value={values.calories}
          onChangeText={(text) => onChange('calories', text)}
          keyboardType='decimal-pad'
          placeholder='0'
          hasError={Boolean(errors.calories)}
          editable={!disabled}
          accessibilityLabel='Calories per serving in kilocalories'
          accessibilityHint={errors.calories}
        />
      </FormField>

      <View style={styles.macroRow}>
        {MACROS.map(({ field, label }) => (
          <FormField key={field} label={`${label} (g)`} optional error={errors[field]} style={styles.macroField}>
            <AppTextInput
              value={values[field]}
              onChangeText={(text) => onChange(field, text)}
              keyboardType='decimal-pad'
              placeholder='0'
              hasError={Boolean(errors[field])}
              editable={!disabled}
              accessibilityLabel={`${label} per serving in grams, optional`}
              accessibilityHint={errors[field]}
            />
          </FormField>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.xl,
  },
  macroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  macroField: {
    flexGrow: 1,
    flexBasis: 96,
  },
});
