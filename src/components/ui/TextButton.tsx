import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, MIN_TOUCH_TARGET } from '@/styles/global';

type TextButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'danger';
  accessibilityHint?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const TONE_COLORS = {
  primary: colors.primary,
  danger: colors.alert,
} as const;

export function TextButton({
  label,
  onPress,
  tone = 'primary',
  accessibilityHint,
  disabled = false,
  style,
}: TextButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole='button'
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        disabled ? styles.disabled : pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, { color: TONE_COLORS[tone] }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH_TARGET - 16,
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.3,
  },
});
