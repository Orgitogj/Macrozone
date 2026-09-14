import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { StepHeader } from '@/components/ui/StepHeader';
import { ActivityLevelStep } from '@/features/nutrition-goals/components/ActivityLevelStep';
import { BodyDetailsStep } from '@/features/nutrition-goals/components/BodyDetailsStep';
import { CalculationReview } from '@/features/nutrition-goals/components/CalculationReview';
import { GoalTargetsEditor } from '@/features/nutrition-goals/components/GoalTargetsEditor';
import { WeightGoalStep } from '@/features/nutrition-goals/components/WeightGoalStep';
import { useGoalCalculatorFlow } from '@/features/nutrition-goals/hooks/useGoalCalculatorFlow';
import type { NutritionPlan } from '@/features/nutrition-goals/types';
import { getCalculatorStepPosition, type CalculatorStep } from '@/features/nutrition-goals/utils/calculatorFlow';
import type { BodyProfile } from '@/features/profile/types';
import { spacing } from '@/theme';

type GoalCalculatorFlowProps = {
  initialProfile: BodyProfile | null;
  onSaved: (plan: NutritionPlan) => void;
  onExit: () => void;
  exitLabel: string;
};

const STEP_COPY: Readonly<Record<CalculatorStep, { title: string; subtitle: string }>> = {
  body: {
    title: 'About you',
    subtitle: 'Used only to estimate your energy needs. Stored on this device.',
  },
  activity: {
    title: 'How active are you?',
    subtitle: 'Pick the level that matches a typical week, including work and exercise.',
  },
  goal: {
    title: 'What is your goal?',
    subtitle: 'Your calorie target is adjusted from your estimated maintenance calories.',
  },
  review: {
    title: 'Review your targets',
    subtitle: 'Save these estimates or adjust them before saving.',
  },
  adjust: {
    title: 'Adjust your targets',
    subtitle: 'Change any target. Your details are still saved for future recalculation.',
  },
};

export function GoalCalculatorFlow({ initialProfile, onSaved, onExit, exitLabel }: GoalCalculatorFlowProps) {
  const flow = useGoalCalculatorFlow({ initialProfile, onSaved, onExit });
  const position = getCalculatorStepPosition(flow.step);
  const copy = STEP_COPY[flow.step];

  return (
    <View>
      <StepHeader current={position.current} total={position.total} title={copy.title} subtitle={copy.subtitle} />

      {flow.step === 'body' ? (
        <BodyDetailsStep
          values={flow.values}
          errors={flow.errors}
          disabled={flow.isSaving}
          onChange={flow.setField}
          onUnitSystemChange={flow.setUnitSystem}
        />
      ) : null}

      {flow.step === 'activity' ? (
        <ActivityLevelStep
          value={flow.values.activityLevel}
          error={flow.errors.activityLevel}
          disabled={flow.isSaving}
          onChange={(activityLevel) => flow.setField('activityLevel', activityLevel)}
        />
      ) : null}

      {flow.step === 'goal' ? (
        <WeightGoalStep
          weightGoal={flow.values.weightGoal}
          weeklyRateKg={flow.values.weeklyRateKg}
          unitSystem={flow.values.unitSystem}
          errors={flow.errors}
          disabled={flow.isSaving}
          onGoalChange={(weightGoal) => flow.setField('weightGoal', weightGoal)}
          onRateChange={(weeklyRateKg) => flow.setField('weeklyRateKg', weeklyRateKg)}
        />
      ) : null}

      {flow.step === 'review' && flow.calculation && flow.profileInput ? (
        <CalculationReview profile={flow.profileInput} calculation={flow.calculation} />
      ) : null}

      {flow.step === 'adjust' && flow.calculation ? (
        <GoalTargetsEditor
          initialGoals={flow.calculation.goals}
          submitLabel='Save Targets'
          onSave={flow.saveAdjusted}
          onSaved={onSaved}
          secondaryAction={<AppButton label='Back to Review' variant='secondary' onPress={flow.goBack} />}
        />
      ) : null}

      {flow.saveError ? (
        <AppText variant='body' tone='danger' style={styles.saveError} accessibilityRole='alert' accessibilityLiveRegion='assertive'>
          {flow.saveError}
        </AppText>
      ) : null}

      {flow.step !== 'adjust' ? (
        <View style={styles.actions}>
          {flow.step === 'review' ? (
            <>
              <AppButton label='Save Targets' onPress={flow.saveCalculated} loading={flow.isSaving} />
              <AppButton
                label='Adjust Targets'
                variant='secondary'
                onPress={flow.startAdjusting}
                disabled={flow.isSaving}
              />
            </>
          ) : (
            <AppButton label='Continue' onPress={flow.goNext} />
          )}
          <AppButton
            label={flow.step === 'body' ? exitLabel : 'Back'}
            variant='secondary'
            onPress={flow.goBack}
            disabled={flow.isSaving}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  saveError: {
    marginTop: spacing.lg,
  },
});
