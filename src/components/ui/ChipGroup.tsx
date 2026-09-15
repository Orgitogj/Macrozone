import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { borderWidths, opacity, radii, spacing, touchTargets, useThemedStyles, type Theme } from '@/theme';

type ChipOption<T extends string> = {
  value: T;
  label: string;
  accessibilityLabel?: string;
};

type ChipGroupProps<T extends string> = {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  role?: 'tablist' | 'radiogroup';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  role = 'radiogroup',
  disabled = false,
  style,
}: ChipGroupProps<T>) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.container, style]} accessibilityRole={role} accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            accessibilityRole={role === 'tablist' ? 'tab' : 'radio'}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={role === 'tablist' ? { selected, disabled } : { checked: selected, disabled }}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.selected,
              pressed && !selected && styles.pressed,
              disabled && styles.disabled,
            ]}
          >
            <AppText variant='label' tone={selected ? 'onPrimary' : 'primary'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    chip: {
      minHeight: touchTargets.min,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
      borderRadius: radii.pill,
      borderWidth: borderWidths.thin,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    selected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    pressed: {
      opacity: opacity.pressed,
    },
    disabled: {
      opacity: opacity.disabled,
    },
  });
