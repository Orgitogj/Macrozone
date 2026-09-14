import { Platform, StyleSheet, Switch, View } from 'react-native';

import { touchTargets, useTheme } from '@/theme';

type AppSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  disabled?: boolean;
};

export function AppSwitch({ value, onValueChange, accessibilityLabel, accessibilityHint, disabled = false }: AppSwitchProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
        thumbColor={Platform.OS === 'android' ? colors.surface : undefined}
        ios_backgroundColor={colors.surfaceMuted}
        accessibilityRole='switch'
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ checked: value, disabled }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: touchTargets.min,
    minWidth: touchTargets.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
