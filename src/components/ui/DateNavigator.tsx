import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { TextButton } from '@/components/ui/TextButton';
import { borderWidths, radii, spacing, useThemedStyles, type Theme } from '@/theme';

type DateNavigatorProps = {
  title: string;
  subtitle?: string;
  center?: ReactNode;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
  onToday?: () => void;
  disabled?: boolean;
  variant?: 'card' | 'plain';
  style?: StyleProp<ViewStyle>;
};

export function DateNavigator({
  title,
  subtitle,
  center,
  onPrevious,
  onNext,
  canGoNext,
  onToday,
  disabled = false,
  variant = 'card',
  style,
}: DateNavigatorProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.container, variant === 'card' && styles.card, style]}>
      <IconButton icon='chevron-back' onPress={onPrevious} disabled={disabled} accessibilityLabel='Previous day' />
      {center ? (
        <View style={styles.center}>{center}</View>
      ) : (
        <View
          style={styles.labels}
          accessible
          accessibilityLiveRegion='polite'
          accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
        >
          <AppText variant='subheading' align='center' numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant='caption' tone='secondary' align='center' numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      )}
      {onToday ? (
        <TextButton label='Today' size='small' onPress={onToday} disabled={disabled} accessibilityHint='Shows today' />
      ) : null}
      <IconButton
        icon='chevron-forward'
        onPress={onNext}
        disabled={disabled || !canGoNext}
        accessibilityLabel='Next day'
        accessibilityHint={canGoNext ? undefined : 'Future days are unavailable'}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: radii.lg,
      borderWidth: borderWidths.hairline,
      borderColor: theme.colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    labels: {
      flex: 1,
      alignItems: 'center',
    },
    center: {
      flex: 1,
    },
  });
