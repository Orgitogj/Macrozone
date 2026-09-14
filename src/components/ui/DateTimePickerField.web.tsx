import type { ChangeEvent, CSSProperties } from 'react';
import { StyleSheet, View } from 'react-native';

import type { DateTimePickerFieldProps } from '@/components/ui/dateTimePickerFieldTypes';
import { borderWidths, componentSizes, fontSizes, opacity, radii, spacing, useTheme } from '@/theme';
import { parseDateTimeInputValue, toDateInputMaximum, toDateTimeInputValue } from '@/utils/dateTimeInput';

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
  const theme = useTheme();
  const inputStyle: CSSProperties = {
    minHeight: componentSizes.control,
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: theme.colors.surface,
    color: isEmpty ? theme.colors.textMuted : theme.colors.textPrimary,
    border: `${borderWidths.thin}px solid ${hasError ? theme.colors.danger : theme.colors.border}`,
    borderRadius: radii.md,
    padding: `${spacing.md}px ${spacing.lg}px`,
    fontSize: fontSizes.body,
    colorScheme: theme.scheme,
    opacity: disabled ? opacity.disabled : 1,
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
