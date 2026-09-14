import { StyleSheet, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { KeyValueRow } from '@/components/ui/KeyValueRow';
import { GOAL_SOURCE_LABELS } from '@/features/nutrition-goals/constants';
import type { NutritionPlan } from '@/features/nutrition-goals/types';
import { getEffectiveGoals } from '@/features/nutrition-goals/utils/goalProgress';
import { ACTIVITY_LEVEL_DETAILS, WEIGHT_GOAL_DETAILS } from '@/features/profile/constants';
import { formatHeight, formatWeeklyRate, formatWeight } from '@/features/profile/utils/units';
import { spacing } from '@/theme';
import { formatCalories, formatGrams } from '@/utils/format';

type GoalsOverviewProps = {
  plan: NutritionPlan;
};

export function GoalsOverview({ plan }: GoalsOverviewProps) {
  const goals = getEffectiveGoals(plan);
  const sourceLabel = GOAL_SOURCE_LABELS[plan.goals?.source ?? 'default'];
  const profile = plan.profile;

  return (
    <View style={styles.container}>
      <AppCard style={styles.card}>
        <View style={styles.titleGroup}>
          <AppText variant='subheading' accessibilityRole='header'>
            Daily targets
          </AppText>
          <AppText variant='caption' tone='accent'>
            {sourceLabel}
          </AppText>
        </View>
        <KeyValueRow label='Calories' value={`${formatCalories(goals.calories)} kcal`} emphasis />
        <KeyValueRow label='Protein' value={formatGrams(goals.protein)} />
        <KeyValueRow label='Carbs' value={formatGrams(goals.carbs)} />
        <KeyValueRow label='Fat' value={formatGrams(goals.fat)} />
      </AppCard>

      {profile ? (
        <AppCard style={styles.card}>
          <AppText variant='subheading' accessibilityRole='header'>
            Saved details
          </AppText>
          <KeyValueRow label='Age' value={`${profile.ageYears} years`} />
          <KeyValueRow label='Height' value={formatHeight(profile.heightCm, profile.unitSystem)} />
          <KeyValueRow label='Weight' value={formatWeight(profile.weightKg, profile.unitSystem)} />
          <KeyValueRow label='Activity' value={ACTIVITY_LEVEL_DETAILS[profile.activityLevel].label} />
          <KeyValueRow
            label='Goal'
            value={
              profile.weightGoal === 'maintain'
                ? WEIGHT_GOAL_DETAILS.maintain.label
                : `${WEIGHT_GOAL_DETAILS[profile.weightGoal].label}, ${formatWeeklyRate(profile.weeklyRateKg, profile.unitSystem)}`
            }
          />
        </AppCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  card: {
    gap: spacing.md,
  },
  titleGroup: {
    gap: spacing.xxs,
  },
});
