import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { FormField } from '@/components/ui/FormField';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { useGoalTargetsForm } from '@/features/nutrition-goals/hooks/useGoalTargetsForm';
import type { DailyNutritionGoals, NutritionPlan } from '@/features/nutrition-goals/types';
import { colors } from '@/styles/global';
import type { MacroKey } from '@/types/nutrition';

type GoalTargetsEditorProps = {
  initialGoals: DailyNutritionGoals;
  submitLabel: string;
  onSave: (goals: DailyNutritionGoals) => Promise<NutritionPlan>;
  onSaved: (plan: NutritionPlan) => void;
  secondaryAction?: ReactNode;
};

const FIELDS: readonly { key: MacroKey; label: string; suffix: string; accessibilityLabel: string }[] = [
  { key: 'calories', label: 'Calories', suffix: 'kcal', accessibilityLabel: 'Daily calorie target in kilocalories' },
  { key: 'protein', label: 'Protein', suffix: 'g', accessibilityLabel: 'Daily protein target in grams' },
  { key: 'carbs', label: 'Carbs', suffix: 'g', accessibilityLabel: 'Daily carbohydrate target in grams' },
  { key: 'fat', label: 'Fat', suffix: 'g', accessibilityLabel: 'Daily fat target in grams' },
];

export function GoalTargetsEditor({
  initialGoals,
  submitLabel,
  onSave,
  onSaved,
  secondaryAction,
}: GoalTargetsEditorProps) {
  const form = useGoalTargetsForm(initialGoals);

  const handleSubmit = async () => {
    const result = await form.submit(onSave);
    if (result?.status === 'saved') {
      onSaved(result.plan);
    }
  };

  return (
    <View style={styles.container}>
      {FIELDS.map(({ key, label, suffix, accessibilityLabel }) => (
        <FormField key={key} label={label} error={form.errors[key]}>
          <AppTextInput
            value={form.values[key]}
            onChangeText={(text) => form.setField(key, text)}
            onBlur={() => form.markTouched(key)}
            keyboardType='decimal-pad'
            suffix={suffix}
            hasError={Boolean(form.errors[key])}
            editable={!form.isSaving}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={form.errors[key]}
          />
        </FormField>
      ))}

      {form.warnings.map((warning) => (
        <NoticeCard key={warning} tone='warning' message={warning} />
      ))}

      {form.saveError ? (
        <Text style={styles.saveError} accessibilityRole='alert' accessibilityLiveRegion='assertive'>
          {form.saveError}
        </Text>
      ) : null}

      <AppButton label={submitLabel} onPress={handleSubmit} loading={form.isSaving} />
      {secondaryAction}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  saveError: {
    fontSize: 14,
    color: colors.alert,
  },
});
