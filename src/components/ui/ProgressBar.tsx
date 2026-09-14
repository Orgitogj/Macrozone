import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/styles/global';

type ProgressBarProps = {
  fraction: number;
  color: string;
  accessibilityLabel: string;
  isOver?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ProgressBar({ fraction, color, accessibilityLabel, isOver = false, style }: ProgressBarProps) {
  const safeFraction = Number.isFinite(fraction) ? Math.min(Math.max(fraction, 0), 1) : 0;
  const percent = Math.round(safeFraction * 100);

  return (
    <View
      style={[styles.track, style]}
      accessible
      accessibilityRole='progressbar'
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <View
        style={[
          styles.fill,
          { width: `${percent}%`, backgroundColor: isOver ? colors.alert : color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
