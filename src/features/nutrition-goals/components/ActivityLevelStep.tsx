import { ChoiceList } from '@/components/ui/ChoiceList';
import { FormField } from '@/components/ui/FormField';
import { ACTIVITY_LEVEL_DETAILS, ACTIVITY_LEVELS } from '@/features/profile/constants';
import type { ActivityLevel } from '@/features/profile/types';

type ActivityLevelStepProps = {
  value: ActivityLevel | null;
  error?: string;
  disabled: boolean;
  onChange: (value: ActivityLevel) => void;
};

const OPTIONS = ACTIVITY_LEVELS.map((value) => ({
  value,
  label: ACTIVITY_LEVEL_DETAILS[value].label,
  description: ACTIVITY_LEVEL_DETAILS[value].description,
}));

export function ActivityLevelStep({ value, error, disabled, onChange }: ActivityLevelStepProps) {
  return (
    <FormField label='Typical activity' error={error}>
      <ChoiceList
        options={OPTIONS}
        value={value}
        onChange={onChange}
        accessibilityLabel='Activity level'
        hasError={Boolean(error)}
        disabled={disabled}
      />
    </FormField>
  );
}
