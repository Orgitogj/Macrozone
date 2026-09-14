import { useCallback, useState } from 'react';

import { getNutritionPlanErrorMessage } from '@/features/nutrition-goals/services/nutritionPlanActions';
import type { DailyNutritionGoals, NutritionPlan } from '@/features/nutrition-goals/types';
import {
  goalsToFormValues,
  validateGoalTargetsForm,
  type GoalTargetsErrors,
  type GoalTargetsFormValues,
} from '@/features/nutrition-goals/validation/goalTargetsForm';
import type { MacroKey } from '@/types/nutrition';
import { MACRO_KEYS } from '@/types/nutrition';
import { createSingleFlight } from '@/utils/singleFlight';

export type GoalTargetsSubmitResult =
  | { status: 'saved'; plan: NutritionPlan }
  | { status: 'invalid' }
  | { status: 'failed' };

export function useGoalTargetsForm(initialGoals: DailyNutritionGoals) {
  const [values, setValues] = useState<GoalTargetsFormValues>(() => goalsToFormValues(initialGoals));
  const [touched, setTouched] = useState<Partial<Record<MacroKey, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flight] = useState(createSingleFlight);

  const validation = validateGoalTargetsForm(values);
  const errors: GoalTargetsErrors = {};
  if (!validation.ok) {
    for (const key of MACRO_KEYS) {
      if ((submitAttempted || touched[key]) && validation.errors[key]) {
        errors[key] = validation.errors[key];
      }
    }
  }

  const setField = useCallback((key: MacroKey, text: string) => {
    setValues((current) => ({ ...current, [key]: text }));
    setSaveError(null);
  }, []);

  const markTouched = useCallback((key: MacroKey) => {
    setTouched((current) => (current[key] ? current : { ...current, [key]: true }));
  }, []);

  const submit = (save: (goals: DailyNutritionGoals) => Promise<NutritionPlan>) =>
    flight.run<GoalTargetsSubmitResult>(async () => {
      setSubmitAttempted(true);
      setSaveError(null);
      const result = validateGoalTargetsForm(values);
      if (!result.ok) {
        return { status: 'invalid' };
      }
      setIsSaving(true);
      try {
        const plan = await save(result.goals);
        return { status: 'saved', plan };
      } catch (error) {
        setSaveError(getNutritionPlanErrorMessage(error, 'Could not save your nutrition goals. Please try again.'));
        return { status: 'failed' };
      } finally {
        setIsSaving(false);
      }
    });

  return {
    values,
    errors,
    warnings: validation.ok ? validation.warnings : [],
    isSaving,
    saveError,
    setField,
    markTouched,
    submit,
  };
}
