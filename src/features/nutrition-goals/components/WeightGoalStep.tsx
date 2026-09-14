import { StyleSheet, View } from 'react-native';

import { ChoiceList } from '@/components/ui/ChoiceList';
import { FormField } from '@/components/ui/FormField';
import { WEIGHT_GOAL_DETAILS, WEIGHT_GOALS } from '@/features/profile/constants';
import type { UnitSystem, WeightGoal } from '@/features/profile/types';
import { getWeeklyRateOptions, isSameWeeklyRate } from '@/features/profile/utils/units';
import type { BodyProfileErrors } from '@/features/profile/validation/bodyProfileForm';

type WeightGoalStepProps = {
  weightGoal: WeightGoal | null;
  weeklyRateKg: number | null;
  unitSystem: UnitSystem;
  errors: BodyProfileErrors;
  disabled: boolean;
  onGoalChange: (goal: WeightGoal) => void;
  onRateChange: (weeklyRateKg: number) => void;
};

const GOAL_OPTIONS = WEIGHT_GOALS.map((value) => ({
  value,
  label: WEIGHT_GOAL_DETAILS[value].label,
  description: WEIGHT_GOAL_DETAILS[value].description,
}));

export function WeightGoalStep({
  weightGoal,
  weeklyRateKg,
  unitSystem,
  errors,
  disabled,
  onGoalChange,
  onRateChange,
}: WeightGoalStepProps) {
  const rateOptions =
    weightGoal === null
      ? []
      : getWeeklyRateOptions(weightGoal, unitSystem).map((option) => ({
          value: option.weeklyRateKg,
          label: option.label,
        }));

  return (
    <View style={styles.container}>
      <FormField label='Goal' error={errors.weightGoal}>
        <ChoiceList
          options={GOAL_OPTIONS}
          value={weightGoal}
          onChange={onGoalChange}
          accessibilityLabel='Weight goal'
          hasError={Boolean(errors.weightGoal)}
          disabled={disabled}
        />
      </FormField>

      {rateOptions.length > 0 ? (
        <FormField
          label={weightGoal === 'lose' ? 'Target rate of loss' : 'Target rate of gain'}
          error={errors.weeklyRateKg}
          hint='Slower rates are usually easier to sustain.'
        >
          <ChoiceList
            options={rateOptions}
            value={weeklyRateKg}
            onChange={onRateChange}
            isSelected={(option, current) => current !== null && isSameWeeklyRate(option, current)}
            accessibilityLabel='Weekly rate of change'
            hasError={Boolean(errors.weeklyRateKg)}
            disabled={disabled}
          />
        </FormField>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
});
