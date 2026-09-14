import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/theme';

type EmptyStateProps = {
  message: string;
  title?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({ message, title, action, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {title ? <AppText variant='subheading'>{title}</AppText> : null}
      <AppText variant='body' tone='secondary'>
        {message}
      </AppText>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
});
