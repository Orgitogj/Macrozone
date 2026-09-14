import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { iconSizes, radii, spacing, useTheme } from '@/theme';

type NoticeCardProps = {
  message: string;
  title?: string;
  tone?: 'info' | 'warning' | 'danger';
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function NoticeCard({ message, title, tone = 'info', children, style }: NoticeCardProps) {
  const { colors } = useTheme();
  const palette = {
    info: { background: colors.primarySubtle, icon: colors.primary, name: 'information-circle-outline' as const },
    warning: { background: colors.warningSubtle, icon: colors.warning, name: 'warning-outline' as const },
    danger: { background: colors.dangerSubtle, icon: colors.danger, name: 'alert-circle-outline' as const },
  }[tone];

  return (
    <View
      style={[styles.card, { backgroundColor: palette.background }, style]}
      accessibilityRole={tone === 'info' ? 'summary' : 'alert'}
    >
      <Ionicons name={palette.name} size={iconSizes.md} color={palette.icon} />
      <View style={styles.body}>
        {title ? <AppText variant='bodyStrong'>{title}</AppText> : null}
        <AppText variant='caption' tone='secondary'>
          {message}
        </AppText>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
});
