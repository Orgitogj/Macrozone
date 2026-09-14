import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import {
  borderWidths,
  componentSizes,
  MAX_FONT_SCALE,
  opacity,
  radii,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
  type Theme,
} from '@/theme';

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
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      style={[
        styles.container,
        isFocused && styles.focused,
        hasError && styles.error,
        !editable && styles.disabled,
      ]}
    >
      <TextInput
        {...props}
        editable={editable}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        maxFontSizeMultiplier={MAX_FONT_SCALE.body}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        style={[styles.input, style]}
      />
      {suffix !== undefined ? (
        <AppText variant='label' tone='secondary' importantForAccessibility='no' style={styles.suffix}>
          {suffix}
        </AppText>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      minHeight: componentSizes.control,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: radii.md,
      borderWidth: borderWidths.thin,
      borderColor: theme.colors.border,
    },
    input: {
      ...typography.body,
      flex: 1,
      minHeight: componentSizes.control,
      color: theme.colors.textPrimary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    suffix: {
      paddingRight: spacing.lg,
    },
    focused: {
      borderColor: theme.colors.borderFocused,
    },
    error: {
      borderColor: theme.colors.danger,
    },
    disabled: {
      opacity: opacity.disabled,
    },
  });
