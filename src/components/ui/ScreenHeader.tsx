import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function ScreenHeader({ title, subtitle, actions }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.texts}>
        <AppText variant='title' accessibilityRole='header'>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant='body' tone='secondary'>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
});
