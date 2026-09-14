import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, MIN_TOUCH_TARGET } from '@/styles/global';

type AppTextInputProps = TextInputProps & {
  hasError?: boolean;
  suffix?: string;
};

export function AppTextInput({
  hasError = false,
  suffix,
  editable = true,
  style,
  onFocus,
  onBlur,
  ...props
}: AppTextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const input = (
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
        suffix !== undefined ? styles.inputWithSuffix : [
          isFocused && styles.focused,
          hasError && styles.error,
          !editable && styles.disabled,
        ],
        style,
      ]}
    />
  );

  if (suffix === undefined) {
    return input;
  }

  return (
    <View
      style={[
        styles.container,
        isFocused && styles.focused,
        hasError && styles.error,
        !editable && styles.disabled,
      ]}
    >
      {input}
      <Text style={styles.suffix} importantForAccessibility='no'>
        {suffix}
      </Text>
    </View>
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
  inputWithSuffix: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingRight: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surface,
    paddingRight: 14,
  },
  suffix: {
    fontSize: 15,
    color: colors.textSecondary,
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
