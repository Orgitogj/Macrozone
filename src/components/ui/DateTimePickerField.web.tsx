import type { ChangeEvent, CSSProperties } from 'react';
import { StyleSheet, View } from 'react-native';

import type { DateTimePickerFieldProps } from '@/components/ui/dateTimePickerFieldTypes';
import { colors, MIN_TOUCH_TARGET } from '@/styles/global';
import {
  parseDateTimeInputValue,
  toDateInputMaximum,
  toDateTimeInputValue,
} from '@/utils/dateTimeInput';

export function DateTimePickerField({
  mode,
  value,
  onChange,
  accessibilityLabel,
  isEmpty = false,
  maximumDate,
  disabled = false,
  hasError = false,
  style,
}: DateTimePickerFieldProps) {
  const inputStyle: CSSProperties = {
    minHeight: MIN_TOUCH_TARGET + 8,
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: colors.surface,
    color: isEmpty ? colors.textSecondary : colors.text,
    border: `1px solid ${hasError ? colors.alert : colors.surface}`,
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 16,
    colorScheme: 'dark',
    opacity: disabled ? 0.6 : 1,
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = parseDateTimeInputValue(mode, event.target.value, {
      reference: value,
      maximumDate: mode === 'date' ? maximumDate : undefined,
    });
    if (next !== null) {
      onChange(next);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <input
        type={mode}
        value={toDateTimeInputValue(mode, value, isEmpty)}
        max={mode === 'date' ? toDateInputMaximum(maximumDate) : undefined}
        onChange={handleChange}
        disabled={disabled}
        aria-label={accessibilityLabel}
        aria-invalid={hasError}
        style={inputStyle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
