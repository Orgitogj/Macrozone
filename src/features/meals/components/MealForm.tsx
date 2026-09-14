import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { DateNavigator } from '@/components/ui/DateNavigator';
import { DateTimePickerField } from '@/components/ui/DateTimePickerField';
import { FormField } from '@/components/ui/FormField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextButton } from '@/components/ui/TextButton';
import { MEAL_LIMITS, MEAL_TYPE_LABELS, MEAL_TYPES } from '@/features/meals/constants';
import {
  dateKeyFromPicker,
  formatMealDateLabel,
  formatMealTimeLabel,
  getDatePickerMaximum,
  getDatePickerValue,
  getTimePickerValue,
  timeFromPicker,
} from '@/features/meals/utils/mealFormPickers';
import type {
  MealFormErrors,
  MealFormField,
  MealFormValues,
} from '@/features/meals/validation/mealForm';
import { spacing } from '@/theme';
import { addDaysToDateKey, compareDateKeys, type LocalDateKey } from '@/utils/date';

type MealFormProps = {
  values: MealFormValues;
  errors: MealFormErrors;
  todayKey: LocalDateKey;
  isSaving: boolean;
  saveError: string | null;
  submitLabel: string;
  onChange: <F extends MealFormField>(field: F, value: MealFormValues[F]) => void;
  onBlur: (field: MealFormField) => void;
  onSubmit: () => void;
  footer?: ReactNode;
};

const MEAL_TYPE_OPTIONS = MEAL_TYPES.map((value) => ({
  value,
  label: MEAL_TYPE_LABELS[value],
}));

type AmountField = 'calories' | 'protein' | 'carbs' | 'fat';

const MACRO_FIELDS: readonly { field: AmountField; label: string; unit: string }[] = [
  { field: 'protein', label: 'Protein', unit: 'g' },
  { field: 'carbs', label: 'Carbs', unit: 'g' },
  { field: 'fat', label: 'Fat', unit: 'g' },
];

export function MealForm({
  values,
  errors,
  todayKey,
  isSaving,
  saveError,
  submitLabel,
  onChange,
  onBlur,
  onSubmit,
  footer,
}: MealFormProps) {
  const [openPicker, setOpenPicker] = useState<'date' | 'time' | null>(null);
  const canGoToNextDay = compareDateKeys(values.date, todayKey) < 0;
  const dateLabel = formatMealDateLabel(values.date, todayKey);
  const timeLabel = formatMealTimeLabel(values.time);

  const trackPicker = (picker: 'date' | 'time') => (open: boolean) => {
    setOpenPicker((current) => (open ? picker : current === picker ? null : current));
  };

  const amountInputProps = (field: AmountField, label: string) => ({
    value: values[field],
    onChangeText: (text: string) => onChange(field, text),
    onBlur: () => onBlur(field),
    keyboardType: 'decimal-pad' as const,
    hasError: Boolean(errors[field]),
    editable: !isSaving,
    accessibilityLabel: label,
    accessibilityHint: errors[field],
    returnKeyType: 'done' as const,
  });

  return (
    <View style={styles.form}>
      <FormField label='Meal name' error={errors.name}>
        <AppTextInput
          value={values.name}
          onChangeText={(text) => onChange('name', text)}
          onBlur={() => onBlur('name')}
          placeholder='e.g. Chicken rice bowl'
          maxLength={MEAL_LIMITS.nameMaxLength}
          autoCapitalize='sentences'
          returnKeyType='done'
          hasError={Boolean(errors.name)}
          editable={!isSaving}
          accessibilityLabel='Meal name'
          accessibilityHint={errors.name}
        />
      </FormField>

      <FormField label='Meal type' error={errors.mealType}>
        <SegmentedControl
          options={MEAL_TYPE_OPTIONS}
          value={values.mealType}
          onChange={(mealType) => onChange('mealType', mealType)}
          accessibilityLabel='Meal type'
          disabled={isSaving}
        />
      </FormField>

      <FormField label='Date' error={errors.date}>
        <DateNavigator
          title={dateLabel}
          onPrevious={() => onChange('date', addDaysToDateKey(values.date, -1))}
          onNext={() => {
            if (canGoToNextDay) {
              onChange('date', addDaysToDateKey(values.date, 1));
            }
          }}
          canGoNext={canGoToNextDay}
          onToday={values.date === todayKey ? undefined : () => onChange('date', todayKey)}
          disabled={isSaving}
          variant='plain'
          center={
            <DateTimePickerField
              mode='date'
              value={getDatePickerValue(values.date)}
              displayValue={dateLabel}
              maximumDate={getDatePickerMaximum(todayKey)}
              onChange={(selected) => {
                onChange('date', dateKeyFromPicker(selected, todayKey));
                onBlur('date');
              }}
              onOpenChange={trackPicker('date')}
              disabled={isSaving}
              hasError={Boolean(errors.date)}
              accessibilityLabel='Date'
              accessibilityHint='Opens a calendar. Future dates are unavailable.'
            />
          }
        />
      </FormField>

      <FormField label='Time' optional error={errors.time}>
        <View style={styles.timeRow}>
          <DateTimePickerField
            mode='time'
            value={getTimePickerValue(values.time, values.date, new Date())}
            displayValue={timeLabel}
            isEmpty={values.time === null}
            onChange={(selected) => {
              onChange('time', timeFromPicker(selected));
              onBlur('time');
            }}
            onOpenChange={trackPicker('time')}
            disabled={isSaving}
            hasError={Boolean(errors.time)}
            accessibilityLabel='Time, optional'
            accessibilityHint='Opens a time picker'
            style={styles.timePicker}
          />
          {values.time !== null ? (
            <TextButton
              label='Clear'
              onPress={() => onChange('time', null)}
              disabled={isSaving}
              accessibilityHint='Removes the time from this meal'
            />
          ) : null}
        </View>
      </FormField>

      <FormField label='Calories (kcal)' error={errors.calories}>
        <AppTextInput placeholder='0' {...amountInputProps('calories', 'Calories in kilocalories')} />
      </FormField>

      <View style={styles.macroRow}>
        {MACRO_FIELDS.map(({ field, label, unit }) => (
          <FormField
            key={field}
            label={`${label} (${unit})`}
            optional
            error={errors[field]}
            style={styles.macroField}
          >
            <AppTextInput placeholder='0' {...amountInputProps(field, `${label} in grams, optional`)} />
          </FormField>
        ))}
      </View>

      {saveError ? (
        <AppText variant='body' tone='danger' accessibilityRole='alert' accessibilityLiveRegion='assertive'>
          {saveError}
        </AppText>
      ) : null}

      <AppButton
        label={submitLabel}
        onPress={onSubmit}
        loading={isSaving}
        disabled={openPicker !== null}
      />

      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.xl,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timePicker: {
    flex: 1,
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
