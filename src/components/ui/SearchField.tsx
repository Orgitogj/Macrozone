import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppTextInput } from '@/components/ui/AppTextInput';
import { IconButton } from '@/components/ui/IconButton';
import { iconSizes, spacing, useTheme } from '@/theme';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  disabled?: boolean;
};

export function SearchField({ value, onChangeText, placeholder, accessibilityLabel, disabled = false }: SearchFieldProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons
        name='search'
        size={iconSizes.md}
        color={colors.textMuted}
        style={styles.icon}
        importantForAccessibility='no'
        accessibilityElementsHidden
      />
      <AppTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole='search'
        autoCapitalize='none'
        autoCorrect={false}
        returnKeyType='search'
        editable={!disabled}
        style={styles.input}
      />
      {value.length > 0 ? (
        <IconButton
          icon='close-circle'
          size={iconSizes.md}
          tone='secondary'
          onPress={() => onChangeText('')}
          accessibilityLabel='Clear search'
          disabled={disabled}
          style={styles.clear}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  icon: {
    position: 'absolute',
    left: spacing.lg,
    zIndex: 1,
  },
  input: {
    paddingLeft: spacing.huge + spacing.xs,
    paddingRight: spacing.huge + spacing.xs,
  },
  clear: {
    position: 'absolute',
    right: spacing.md,
  },
});
