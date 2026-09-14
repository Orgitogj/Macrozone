import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/theme';

type FormFieldProps = {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
  optional?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function FormField({ label, children, error, hint, optional = false, style }: FormFieldProps) {
  return (
    <View style={[styles.container, style]}>
      <AppText variant='label' importantForAccessibility='no'>
        {label}
        {optional ? (
          <AppText variant='label' tone='muted'>
            {' '}
            (optional)
          </AppText>
        ) : null}
      </AppText>
      {children}
      {error ? (
        <AppText variant='caption' tone='danger' accessibilityRole='alert' accessibilityLiveRegion='polite'>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant='caption' tone='secondary'>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
});
