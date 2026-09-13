import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { TextButton } from '@/components/ui/TextButton';
import { colors } from '@/styles/global';

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function ErrorState({
  message,
  onRetry,
  retryLabel = 'Try again',
  style,
}: ErrorStateProps) {
  return (
    <View style={[styles.container, style]} accessibilityRole='alert'>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <TextButton label={retryLabel} onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    alignItems: 'flex-start',
  },
  message: {
    color: colors.alert,
    fontSize: 14,
  },
});
