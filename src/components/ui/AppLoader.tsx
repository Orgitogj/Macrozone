import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing, useTheme } from '@/theme';

type AppLoaderProps = {
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function AppLoader({ accessibilityLabel = 'Loading', style }: AppLoaderProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, style]} accessible accessibilityRole='progressbar' accessibilityLabel={accessibilityLabel}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
});
