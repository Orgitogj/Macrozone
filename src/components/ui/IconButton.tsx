import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, MIN_TOUCH_TARGET } from '@/styles/global';

type IconButtonProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  disabled?: boolean;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  size = 24,
  color = colors.primary,
  style,
}: IconButtonProps) {
  const slop = Math.max(0, (MIN_TOUCH_TARGET - size) / 2);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={slop}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        disabled ? styles.disabled : pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.3,
  },
});
