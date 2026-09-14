import { StyleSheet, View, type ViewProps } from 'react-native';

import { borderWidths, radii, spacing, useThemedStyles, type Theme } from '@/theme';

type AppCardProps = ViewProps & {
  padding?: keyof typeof spacing;
};

export function AppCard({ padding = 'lg', style, ...props }: AppCardProps) {
  const styles = useThemedStyles(createStyles);
  return <View {...props} style={[styles.card, { padding: spacing[padding] }, style]} />;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: borderWidths.hairline,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
  });
