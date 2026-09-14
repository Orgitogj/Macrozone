import { StyleSheet, Text, View } from 'react-native';

import { NoticeCard } from '@/components/ui/NoticeCard';
import { ESTIMATE_DISCLAIMER, MACRO_RULES } from '@/features/nutrition-goals/constants';
import type { NutritionTargetCalculation } from '@/features/nutrition-goals/utils/goalCalculator';
import { ACTIVITY_LEVEL_DETAILS } from '@/features/profile/constants';
import type { BodyProfileInput } from '@/features/profile/types';
import { formatHeight, formatWeeklyRate, formatWeight } from '@/features/profile/utils/units';
import { colors } from '@/styles/global';
import { formatCalories, formatGrams } from '@/utils/format';

type CalculationReviewProps = {
  profile: BodyProfileInput;
  calculation: NutritionTargetCalculation;
};

function Row({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.rowLabel, emphasis && styles.emphasis]}>{label}</Text>
      <Text style={[styles.rowValue, emphasis && styles.emphasis]}>{value}</Text>
    </View>
  );
}

export function CalculationReview({ profile, calculation }: CalculationReviewProps) {
  const { goals } = calculation;
  const adjustment = calculation.dailyAdjustment;
  const adjustmentText =
    adjustment === 0 ? 'None' : `${adjustment > 0 ? '+' : '−'}${formatCalories(Math.abs(adjustment))} kcal`;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle} accessibilityRole='header'>
          Your daily targets
        </Text>
        <Row label='Calories' value={`${formatCalories(goals.calories)} kcal`} emphasis />
        <Row label='Protein' value={formatGrams(goals.protein)} />
        <Row label='Carbs' value={formatGrams(goals.carbs)} />
        <Row label='Fat' value={formatGrams(goals.fat)} />
      </View>

      {calculation.minimumApplied ? (
        <NoticeCard
          tone='warning'
          title='Raised to a safer minimum'
          message={`Your goal rate would put you at ${formatCalories(calculation.unadjustedCalorieTarget)} kcal, so the target was raised to ${formatCalories(calculation.minimumCalories)} kcal. Consider a slower rate or professional guidance.`}
        />
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle} accessibilityRole='header'>
          How this was calculated
        </Text>
        <Row
          label='Your details'
          value={`${profile.ageYears} yrs · ${formatHeight(profile.heightCm, profile.unitSystem)} · ${formatWeight(profile.weightKg, profile.unitSystem)}`}
        />
        <Row label='BMR (Mifflin–St Jeor)' value={`${formatCalories(calculation.bmr)} kcal`} />
        <Row
          label={`Activity: ${ACTIVITY_LEVEL_DETAILS[profile.activityLevel].label} (× ${calculation.activityFactor})`}
          value={`${formatCalories(calculation.tdee)} kcal`}
        />
        <Row
          label={
            profile.weightGoal === 'maintain'
              ? 'Goal adjustment'
              : `Goal adjustment (${formatWeeklyRate(profile.weeklyRateKg, profile.unitSystem)})`
          }
          value={adjustmentText}
        />
        <Text style={styles.explanation}>
          BMR = 10 × weight (kg) + 6.25 × height (cm) − 5 × age + a sex-based constant. TDEE = BMR × activity
          factor. Each kilogram of body weight is treated as about 7,700 kcal. Protein is{' '}
          {calculation.proteinGramsPerKg} g per kg of body weight (capped at{' '}
          {Math.round(MACRO_RULES.proteinMaxCalorieShare * 100)}% of calories), fat is{' '}
          {Math.round(MACRO_RULES.fatCalorieShare * 100)}% of calories, and carbs fill the rest.
        </Text>
      </View>

      <NoticeCard message={ESTIMATE_DISCLAIMER} />
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
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  emphasis: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  explanation: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
});
