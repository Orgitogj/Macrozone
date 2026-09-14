import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { colors, MIN_TOUCH_TARGET } from '@/styles/global';

type AppTextInputProps = TextInputProps & {
  hasError?: boolean;
};

export function AppTextInput({
  hasError = false,
  editable = true,
  style,
  onFocus,
  onBlur,
  ...props
}: AppTextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TextInput
      {...props}
      editable={editable}
      placeholderTextColor={colors.textSecondary}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        onBlur?.(event);
      }}
      style={[
        styles.input,
        isFocused && styles.focused,
        hasError && styles.error,
        !editable && styles.disabled,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: MIN_TOUCH_TARGET + 8,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surface,
    fontSize: 16,
  },
  focused: {
    borderColor: colors.primary,
  },
  error: {
    borderColor: colors.alert,
  },
  disabled: {
    opacity: 0.6,
  },
});
