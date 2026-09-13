import {
  ActivityIndicator,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/styles/global';

type AppLoaderProps = {
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function AppLoader({
  accessibilityLabel = 'Loading',
  style,
}: AppLoaderProps) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator
        color={colors.primary}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
