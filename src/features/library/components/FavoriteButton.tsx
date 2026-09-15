import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { iconSizes, opacity, touchTargets, useTheme } from '@/theme';

type FavoriteButtonProps = {
  name: string;
  isFavorite: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

export function FavoriteButton({ name, isFavorite, onToggle, disabled = false }: FavoriteButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole='togglebutton'
      accessibilityLabel={`Favorite ${name}`}
      accessibilityHint={isFavorite ? 'Removes this food from favorites' : 'Adds this food to favorites'}
      accessibilityState={{ checked: isFavorite, disabled }}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dimmed]}
    >
      <Ionicons
        name={isFavorite ? 'star' : 'star-outline'}
        size={iconSizes.lg}
        color={isFavorite ? colors.warning : colors.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: touchTargets.min,
    minHeight: touchTargets.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {
    opacity: opacity.pressed,
  },
});
