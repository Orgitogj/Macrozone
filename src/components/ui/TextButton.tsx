import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { iconSizes, opacity, spacing, touchTargets, useTheme } from '@/theme';

type TextButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'danger' | 'secondary';
  icon?: ComponentProps<typeof Ionicons>['name'];
  size?: 'regular' | 'small';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function TextButton({
  label,
  onPress,
  tone = 'primary',
  icon,
  size = 'regular',
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  style,
}: TextButtonProps) {
  const { colors } = useTheme();
  const color = tone === 'danger' ? colors.danger : tone === 'secondary' ? colors.textSecondary : colors.primary;
  const textTone = tone === 'danger' ? 'danger' : tone === 'secondary' ? 'secondary' : 'accent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={spacing.sm}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        disabled ? styles.disabled : pressed && styles.pressed,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={size === 'small' ? iconSizes.sm : iconSizes.md} color={color} /> : null}
      <AppText variant={size === 'small' ? 'label' : 'bodyStrong'} tone={textTone}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: touchTargets.min - spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  disabled: {
    opacity: opacity.disabled,
  },
});
