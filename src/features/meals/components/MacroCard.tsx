import { StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '@/components/ui/ProgressBar';
import type { MacroGoalProgress } from '@/features/nutrition-goals/types';
import { describeGoalProgress } from '@/features/nutrition-goals/utils/goalProgress';
import { colors } from '@/styles/global';

type MacroCardProps = {
  label: string;
  progress: MacroGoalProgress;
  format: (value: number) => string;
  color: string;
};

export function MacroCard({ label, progress, format, color }: MacroCardProps) {
  const description = describeGoalProgress(label, progress, format);

  return (
    <View
      style={[styles.card, { borderLeftColor: color }]}
      accessible
      accessibilityLabel={description.accessibilityText}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{format(progress.consumed)}</Text>
      <Text style={styles.goal}>{description.hasTarget ? `/ ${format(progress.goal)}` : 'No target'}</Text>
      <ProgressBar
        fraction={description.fraction}
        color={color}
        isOver={description.isOver}
        accessibilityLabel={description.accessibilityText}
        style={styles.progress}
      />
      {description.hasTarget ? (
        <Text style={[styles.status, description.isOver && styles.over]}>{description.statusText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    width: '47%',
    borderLeftWidth: 4,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  goal: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progress: {
    marginTop: 10,
  },
  status: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  over: {
    color: colors.alert,
  },
});
