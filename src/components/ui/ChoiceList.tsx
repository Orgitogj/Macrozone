import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, MIN_TOUCH_TARGET } from '@/styles/global';

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
              <Text style={styles.label}>{option.label}</Text>
              {option.description ? <Text style={styles.description}>{option.description}</Text> : null}
            </View>
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={selected ? colors.primary : colors.textSecondary}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  option: {
    minHeight: MIN_TOUCH_TARGET + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selected: {
    borderColor: colors.primary,
  },
  error: {
    borderColor: colors.alert,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
