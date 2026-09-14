import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/styles/global';

type StepHeaderProps = {
  current: number;
  total: number;
  title: string;
  subtitle?: string;
};

export function StepHeader({ current, total, title, subtitle }: StepHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.step} accessibilityLabel={`Step ${current} of ${total}`}>
        Step {current} of {total}
      </Text>
      <View style={styles.track} importantForAccessibility='no-hide-descendants'>
        {Array.from({ length: total }, (_, index) => (
          <View key={index} style={[styles.segment, index < current && styles.segmentDone]} />
        ))}
      </View>
      <Text style={styles.title} accessibilityRole='header'>
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: 20,
  },
  step: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  track: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface,
  },
  segmentDone: {
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
