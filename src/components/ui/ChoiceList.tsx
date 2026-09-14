import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import {
  borderWidths,
  iconSizes,
  opacity,
  radii,
  spacing,
  touchTargets,
  useTheme,
  useThemedStyles,
  type Theme,
} from '@/theme';

export type ChoiceOption<T extends string | number> = {
  value: T;
  label: string;
  description?: string;
};

type ChoiceListProps<T extends string | number> = {
  options: readonly ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  isSelected?: (option: T, value: T | null) => boolean;
  disabled?: boolean;
  hasError?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ChoiceList<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
  isSelected = (option, current) => option === current,
  disabled = false,
  hasError = false,
  style,
}: ChoiceListProps<T>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.list, style]} accessibilityRole='radiogroup' accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = isSelected(option.value, value);
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            accessibilityRole='radio'
            accessibilityLabel={option.description ? `${option.label}, ${option.description}` : option.label}
            accessibilityState={{ checked: selected, disabled }}
            style={({ pressed }) => [
              styles.option,
              selected && styles.selected,
              hasError && !selected && styles.error,
              pressed && !disabled && styles.pressed,
              disabled && styles.disabled,
            ]}
          >
            <View style={styles.texts}>
              <AppText variant='bodyStrong'>{option.label}</AppText>
              {option.description ? (
                <AppText variant='caption' tone='secondary'>
                  {option.description}
                </AppText>
              ) : null}
            </View>
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={iconSizes.md}
              color={selected ? colors.primary : colors.textMuted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    list: {
      gap: spacing.sm,
    },
    option: {
      minHeight: touchTargets.comfortable,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: radii.md,
      borderWidth: borderWidths.thin,
      borderColor: theme.colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    selected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primarySubtle,
    },
    error: {
      borderColor: theme.colors.danger,
    },
    pressed: {
      opacity: opacity.pressed,
    },
    disabled: {
      opacity: opacity.disabled,
    },
    texts: {
      flex: 1,
      gap: spacing.xxs,
    },
  });
