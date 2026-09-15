import { StyleSheet, View } from 'react-native';

import { DateNavigator } from '@/components/ui/DateNavigator';
import { DateTimePickerField } from '@/components/ui/DateTimePickerField';
import { FormField } from '@/components/ui/FormField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { MEAL_TYPE_LABELS, MEAL_TYPES } from '@/features/meals/constants';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import {
  dateKeyFromPicker,
  formatMealDateLabel,
  getDatePickerMaximum,
  getDatePickerValue,
} from '@/features/meals/utils/mealFormPickers';
import { spacing } from '@/theme';
import { addDaysToDateKey, compareDateKeys, type LocalDateKey } from '@/utils/date';

type LogDestinationFieldsProps = {
  destination: LogDestination;
  todayKey: LocalDateKey;
  onChange: (destination: LogDestination) => void;
  disabled?: boolean;
};

const MEAL_TYPE_OPTIONS = MEAL_TYPES.map((value) => ({ value, label: MEAL_TYPE_LABELS[value] }));

export function LogDestinationFields({ destination, todayKey, onChange, disabled = false }: LogDestinationFieldsProps) {
  const dateLabel = formatMealDateLabel(destination.date, todayKey);
  const canGoNext = compareDateKeys(destination.date, todayKey) < 0;

  return (
    <View style={styles.container}>
      <FormField label='Add to'>
        <DateNavigator
          title={dateLabel}
          variant='plain'
          disabled={disabled}
          canGoNext={canGoNext}
          onPrevious={() => onChange({ ...destination, date: addDaysToDateKey(destination.date, -1) })}
          onNext={() => {
            if (canGoNext) {
              onChange({ ...destination, date: addDaysToDateKey(destination.date, 1) });
            }
          }}
          onToday={destination.date === todayKey ? undefined : () => onChange({ ...destination, date: todayKey })}
          center={
            <DateTimePickerField
              mode='date'
              value={getDatePickerValue(destination.date)}
              displayValue={dateLabel}
              maximumDate={getDatePickerMaximum(todayKey)}
              onChange={(selected) => onChange({ ...destination, date: dateKeyFromPicker(selected, todayKey) })}
              disabled={disabled}
              accessibilityLabel='Diary date'
              accessibilityHint='Opens a calendar. Future dates are unavailable.'
            />
          }
        />
      </FormField>
      <SegmentedControl
        options={MEAL_TYPE_OPTIONS}
        value={destination.mealType}
        onChange={(mealType) => onChange({ ...destination, mealType })}
        accessibilityLabel='Meal type'
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
});
