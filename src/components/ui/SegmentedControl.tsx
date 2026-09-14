import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { componentSizes, opacity, radii, spacing, useThemedStyles, type Theme } from '@/theme';

type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  disabled = false,
  style,
}: SegmentedControlProps<T>) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.container, style]} accessibilityRole='radiogroup' accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            accessibilityRole='radio'
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected, disabled }}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.selected,
              pressed && !selected && styles.pressed,
              disabled && styles.disabled,
            ]}
          >
            <AppText
              variant='label'
              tone={selected ? 'onPrimary' : 'primary'}
              align='center'
              numberOfLines={2}
            >
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
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: radii.md,
      padding: spacing.xs,
      gap: spacing.xs,
    },
    segment: {
      flex: 1,
      minHeight: componentSizes.segment,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs,
    },
    selected: {
      backgroundColor: theme.colors.primary,
    },
    pressed: {
      opacity: opacity.pressed,
    },
    disabled: {
      opacity: opacity.disabled,
    },
  });
