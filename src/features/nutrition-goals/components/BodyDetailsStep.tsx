import { StyleSheet, View } from 'react-native';

import { AppTextInput } from '@/components/ui/AppTextInput';
import { FormField } from '@/components/ui/FormField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { FORMULA_SEX_LABELS, FORMULA_SEXES, UNIT_SYSTEM_LABELS, UNIT_SYSTEMS } from '@/features/profile/constants';
import type { FormulaSex, UnitSystem } from '@/features/profile/types';
import type { BodyProfileErrors, BodyProfileFormValues } from '@/features/profile/validation/bodyProfileForm';

type BodyDetailsStepProps = {
  values: BodyProfileFormValues;
  errors: BodyProfileErrors;
  disabled: boolean;
  onChange: <K extends keyof BodyProfileFormValues>(field: K, value: BodyProfileFormValues[K]) => void;
  onUnitSystemChange: (unitSystem: UnitSystem) => void;
};

const UNIT_OPTIONS = UNIT_SYSTEMS.map((value) => ({ value, label: UNIT_SYSTEM_LABELS[value] }));
const SEX_OPTIONS = FORMULA_SEXES.map((value) => ({ value, label: FORMULA_SEX_LABELS[value] }));

export function BodyDetailsStep({ values, errors, disabled, onChange, onUnitSystemChange }: BodyDetailsStepProps) {
  const isMetric = values.unitSystem === 'metric';

  return (
    <View style={styles.container}>
      <FormField label='Units'>
        <SegmentedControl
          options={UNIT_OPTIONS}
          value={values.unitSystem}
          onChange={onUnitSystemChange}
          accessibilityLabel='Measurement units'
          disabled={disabled}
        />
      </FormField>

      <FormField
        label='Sex used for the calculation'
        error={errors.sex}
        hint='The formula uses different constants. "Not specified" uses the midpoint and is less precise.'
      >
        <SegmentedControl<FormulaSex | 'none'>
          options={SEX_OPTIONS}
          value={values.sex ?? 'none'}
          onChange={(sex) => {
            if (sex !== 'none') {
              onChange('sex', sex);
            }
          }}
          accessibilityLabel='Sex used for the calculation'
          disabled={disabled}
        />
      </FormField>

      <FormField label='Age' error={errors.age}>
        <AppTextInput
          value={values.age}
          onChangeText={(text) => onChange('age', text)}
          keyboardType='number-pad'
          placeholder='30'
          suffix='years'
          maxLength={3}
          hasError={Boolean(errors.age)}
          editable={!disabled}
          accessibilityLabel='Age in years'
          accessibilityHint={errors.age}
        />
      </FormField>

      <FormField label='Height' error={errors.height}>
        {isMetric ? (
          <AppTextInput
            value={values.heightCm}
            onChangeText={(text) => onChange('heightCm', text)}
            keyboardType='decimal-pad'
            placeholder='175'
            suffix='cm'
            hasError={Boolean(errors.height)}
            editable={!disabled}
            accessibilityLabel='Height in centimeters'
            accessibilityHint={errors.height}
          />
        ) : (
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <AppTextInput
                value={values.heightFeet}
                onChangeText={(text) => onChange('heightFeet', text)}
                keyboardType='number-pad'
                placeholder='5'
                suffix='ft'
                maxLength={1}
                hasError={Boolean(errors.height)}
                editable={!disabled}
                accessibilityLabel='Height, feet'
                accessibilityHint={errors.height}
              />
            </View>
            <View style={styles.rowItem}>
              <AppTextInput
                value={values.heightInches}
                onChangeText={(text) => onChange('heightInches', text)}
                keyboardType='decimal-pad'
                placeholder='9'
                suffix='in'
                hasError={Boolean(errors.height)}
                editable={!disabled}
                accessibilityLabel='Height, inches'
                accessibilityHint={errors.height}
              />
            </View>
          </View>
        )}
      </FormField>

      <FormField label='Current weight' error={errors.weight}>
        <AppTextInput
          value={values.weight}
          onChangeText={(text) => onChange('weight', text)}
          keyboardType='decimal-pad'
          placeholder={isMetric ? '70' : '155'}
          suffix={isMetric ? 'kg' : 'lb'}
          hasError={Boolean(errors.weight)}
          editable={!disabled}
          accessibilityLabel={isMetric ? 'Weight in kilograms' : 'Weight in pounds'}
          accessibilityHint={errors.weight}
        />
      </FormField>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowItem: {
    flex: 1,
  },
});
