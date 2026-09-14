import type { StyleProp, ViewStyle } from 'react-native';

export type DateTimePickerMode = 'date' | 'time';

export type DateTimePickerFieldProps = {
  mode: DateTimePickerMode;
  value: Date;
  displayValue: string;
  onChange: (value: Date) => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  isEmpty?: boolean;
  maximumDate?: Date;
  disabled?: boolean;
  hasError?: boolean;
  onOpenChange?: (open: boolean) => void;
  style?: StyleProp<ViewStyle>;
};
