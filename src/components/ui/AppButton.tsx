import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { borderWidths, componentSizes, opacity, radii, spacing, useTheme, useThemedStyles, type Theme } from '@/theme';

type AppButtonVariant = 'primary' | 'secondary' | 'danger';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: AppButtonProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isDisabled = disabled || loading;
  const textTone = variant === 'primary' ? 'onPrimary' : variant === 'danger' ? 'danger' : 'accent';
  const indicatorColor =
    variant === 'primary' ? theme.colors.textOnPrimary : variant === 'danger' ? theme.colors.danger : theme.colors.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && !isDisabled && (variant === 'primary' ? styles.primaryPressed : styles.pressed),
        disabled && !loading && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} />
      ) : (
        <AppText variant='bodyStrong' tone={textTone} align='center'>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      minHeight: componentSizes.control,
      borderRadius: radii.md,
      borderWidth: borderWidths.thin,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primary: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    secondary: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    danger: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.danger,
    },
    primaryPressed: {
      backgroundColor: theme.colors.primaryPressed,
      borderColor: theme.colors.primaryPressed,
    },
    pressed: {
      opacity: opacity.pressed,
    },
    disabled: {
      opacity: opacity.disabled,
    },
  });
