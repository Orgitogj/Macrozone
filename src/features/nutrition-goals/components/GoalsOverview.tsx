import { StyleSheet, Text, View } from 'react-native';

import { GOAL_SOURCE_LABELS } from '@/features/nutrition-goals/constants';
import type { NutritionPlan } from '@/features/nutrition-goals/types';
import { getEffectiveGoals } from '@/features/nutrition-goals/utils/goalProgress';
import { ACTIVITY_LEVEL_DETAILS, WEIGHT_GOAL_DETAILS } from '@/features/profile/constants';
import { formatHeight, formatWeeklyRate, formatWeight } from '@/features/profile/utils/units';
import { colors } from '@/styles/global';
import { formatCalories, formatGrams } from '@/utils/format';

type GoalsOverviewProps = {
  plan: NutritionPlan;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function GoalsOverview({ plan }: GoalsOverviewProps) {
  const goals = getEffectiveGoals(plan);
  const sourceLabel = GOAL_SOURCE_LABELS[plan.goals?.source ?? 'default'];
  const profile = plan.profile;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle} accessibilityRole='header'>
          Daily targets
        </Text>
        <Text style={styles.source}>{sourceLabel}</Text>
        <Row label='Calories' value={`${formatCalories(goals.calories)} kcal`} />
        <Row label='Protein' value={formatGrams(goals.protein)} />
        <Row label='Carbs' value={formatGrams(goals.carbs)} />
        <Row label='Fat' value={formatGrams(goals.fat)} />
      </View>

      {profile ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole='header'>
            Saved details
          </Text>
          <Row label='Age' value={`${profile.ageYears} years`} />
          <Row label='Height' value={formatHeight(profile.heightCm, profile.unitSystem)} />
          <Row label='Weight' value={formatWeight(profile.weightKg, profile.unitSystem)} />
          <Row label='Activity' value={ACTIVITY_LEVEL_DETAILS[profile.activityLevel].label} />
          <Row
            label='Goal'
            value={
              profile.weightGoal === 'maintain'
                ? WEIGHT_GOAL_DETAILS.maintain.label
                : `${WEIGHT_GOAL_DETAILS[profile.weightGoal].label}, ${formatWeeklyRate(profile.weeklyRateKg, profile.unitSystem)}`
            }
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  source: {
    fontSize: 13,
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  rowValue: {
    flexShrink: 1,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
});
