import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { componentSizes, radii, useTheme } from '@/theme';

type ProgressBarProps = {
  fraction: number;
  color: string;
  accessibilityLabel: string;
  isOver?: boolean;
  size?: 'regular' | 'compact';
  style?: StyleProp<ViewStyle>;
};

export function ProgressBar({
  fraction,
  color,
  accessibilityLabel,
  isOver = false,
  size = 'regular',
  style,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const safeFraction = Number.isFinite(fraction) ? Math.min(Math.max(fraction, 0), 1) : 0;
  const percent = Math.round(safeFraction * 100);
  const height = size === 'compact' ? componentSizes.progressBarCompact : componentSizes.progressBar;

  return (
    <View
      style={[styles.track, { height, backgroundColor: colors.surfaceMuted }, style]}
      accessible
      accessibilityRole='progressbar'
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <View style={[styles.fill, { width: `${percent}%`, backgroundColor: isOver ? colors.danger : color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
});
