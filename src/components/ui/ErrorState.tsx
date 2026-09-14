import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { TextButton } from '@/components/ui/TextButton';
import { spacing } from '@/theme';

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function ErrorState({ message, onRetry, retryLabel = 'Try again', style }: ErrorStateProps) {
  return (
    <View style={[styles.container, style]} accessibilityRole='alert'>
      <AppText variant='body' tone='danger'>
        {message}
      </AppText>
      {onRetry ? <TextButton label={retryLabel} icon='refresh' onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    alignItems: 'flex-start',
    paddingVertical: spacing.lg,
  },
});
