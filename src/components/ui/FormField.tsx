import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/styles/global';

type FormFieldProps = {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
  optional?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function FormField({
  label,
  children,
  error,
  hint,
  optional = false,
  style,
}: FormFieldProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label} importantForAccessibility='no'>
        {label}
        {optional ? <Text style={styles.optional}> (optional)</Text> : null}
      </Text>
      {children}
      {error ? (
        <Text style={styles.error} accessibilityRole='alert' accessibilityLiveRegion='polite'>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  optional: {
    fontWeight: 'normal',
    color: colors.textSecondary,
  },
  error: {
    fontSize: 13,
    color: colors.alert,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
