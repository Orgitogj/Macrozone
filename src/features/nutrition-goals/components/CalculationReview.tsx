import { StyleSheet, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { KeyValueRow } from '@/components/ui/KeyValueRow';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { ESTIMATE_DISCLAIMER, MACRO_RULES } from '@/features/nutrition-goals/constants';
import type { NutritionTargetCalculation } from '@/features/nutrition-goals/utils/goalCalculator';
import { ACTIVITY_LEVEL_DETAILS } from '@/features/profile/constants';
import type { BodyProfileInput } from '@/features/profile/types';
import { formatHeight, formatWeeklyRate, formatWeight } from '@/features/profile/utils/units';
import { spacing } from '@/theme';
import { formatCalories, formatGrams } from '@/utils/format';

type CalculationReviewProps = {
  profile: BodyProfileInput;
  calculation: NutritionTargetCalculation;
};

export function CalculationReview({ profile, calculation }: CalculationReviewProps) {
  const { goals } = calculation;
  const adjustment = calculation.dailyAdjustment;
  const adjustmentText =
    adjustment === 0 ? 'None' : `${adjustment > 0 ? '+' : '−'}${formatCalories(Math.abs(adjustment))} kcal`;

  return (
    <View style={styles.container}>
      <AppCard style={styles.card}>
        <AppText variant='subheading' accessibilityRole='header'>
          Estimated daily targets
        </AppText>
        <KeyValueRow label='Calories' value={`${formatCalories(goals.calories)} kcal`} emphasis />
        <KeyValueRow label='Protein' value={formatGrams(goals.protein)} />
        <KeyValueRow label='Carbs' value={formatGrams(goals.carbs)} />
        <KeyValueRow label='Fat' value={formatGrams(goals.fat)} />
      </AppCard>

      {calculation.minimumApplied ? (
        <NoticeCard
          tone='warning'
          title='Raised to a minimum estimate'
          message={`Your goal rate would give an estimate of ${formatCalories(calculation.unadjustedCalorieTarget)} kcal, so the target was raised to ${formatCalories(calculation.minimumCalories)} kcal. Consider a slower rate or guidance from a health professional.`}
        />
      ) : null}

      <AppCard style={styles.card}>
        <AppText variant='subheading' accessibilityRole='header'>
          How this estimate was calculated
        </AppText>
        <KeyValueRow
          label='Your details'
          value={`${profile.ageYears} yrs · ${formatHeight(profile.heightCm, profile.unitSystem)} · ${formatWeight(profile.weightKg, profile.unitSystem)}`}
        />
        <KeyValueRow label='Estimated BMR (Mifflin–St Jeor)' value={`${formatCalories(calculation.bmr)} kcal`} />
        <KeyValueRow
          label={`Estimated TDEE: ${ACTIVITY_LEVEL_DETAILS[profile.activityLevel].label} (× ${calculation.activityFactor})`}
          value={`${formatCalories(calculation.tdee)} kcal`}
        />
        <KeyValueRow
          label={
            profile.weightGoal === 'maintain'
              ? 'Goal adjustment'
              : `Goal adjustment (${formatWeeklyRate(profile.weeklyRateKg, profile.unitSystem)})`
          }
          value={adjustmentText}
        />
        <AppText variant='caption' tone='secondary'>
          BMR = 10 × weight (kg) + 6.25 × height (cm) − 5 × age + a sex-based constant. TDEE = BMR × activity
          factor. Each kilogram of body weight is treated as about 7,700 kcal. Protein is estimated at{' '}
          {calculation.proteinGramsPerKg} g per kg of body weight (capped at{' '}
          {Math.round(MACRO_RULES.proteinMaxCalorieShare * 100)}% of calories), fat at{' '}
          {Math.round(MACRO_RULES.fatCalorieShare * 100)}% of calories, and carbs fill the rest.
        </AppText>
      </AppCard>

      <NoticeCard message={ESTIMATE_DISCLAIMER} />
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
});
