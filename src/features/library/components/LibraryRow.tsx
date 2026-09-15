import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { borderWidths, opacity, radii, spacing, touchTargets, useThemedStyles, type Theme } from '@/theme';

type LibraryRowProps = {
  title: string;
  subtitle: string;
  detail?: string;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint: string;
  trailing?: ReactNode;
  disabled?: boolean;
};

export function LibraryRow({
  title,
  subtitle,
  detail,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  trailing,
  disabled = false,
}: LibraryRowProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole='button'
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [styles.content, pressed && styles.pressed]}
      >
        <View style={styles.titleRow}>
          <AppText variant='bodyStrong' numberOfLines={2} style={styles.title}>
            {title}
          </AppText>
          {detail ? <AppText variant='bodyStrong'>{detail}</AppText> : null}
        </View>
        <AppText variant='caption' tone='secondary'>
          {subtitle}
        </AppText>
      </Pressable>
      {trailing}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: touchTargets.comfortable,
      backgroundColor: theme.colors.surface,
      borderRadius: radii.md,
      borderWidth: borderWidths.hairline,
      borderColor: theme.colors.border,
      paddingRight: spacing.xs,
    },
    content: {
      flex: 1,
      paddingVertical: spacing.md,
      paddingLeft: spacing.lg,
      paddingRight: spacing.sm,
      gap: spacing.xxs,
    },
    pressed: {
      opacity: opacity.pressed,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    title: {
      flex: 1,
    },
  });
