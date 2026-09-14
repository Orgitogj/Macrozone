import { useCallback, useState } from 'react';

import {
  submitMealForm,
  type MealFormSubmitResult,
} from '@/features/meals/services/mealActions';
import type { Meal, MealInput } from '@/features/meals/types';
import {
  areMealFormValuesEqual,
  MEAL_FORM_FIELDS,
  validateMealForm,
  type MealFormErrors,
  type MealFormField,
  type MealFormValues,
} from '@/features/meals/validation/mealForm';
import { useTodayDateKey } from '@/hooks/useTodayDateKey';
import { createSingleFlight } from '@/utils/singleFlight';

export function useMealForm(initialValues: MealFormValues) {
  const todayKey = useTodayDateKey();
  const [values, setValues] = useState(initialValues);
  const [baseline, setBaseline] = useState(initialValues);
  const [touched, setTouched] = useState<Partial<Record<MealFormField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [singleFlight] = useState(createSingleFlight);

  const validation = validateMealForm(values, todayKey);
  const allErrors: MealFormErrors = validation.ok ? {} : validation.errors;
  const errors: MealFormErrors = {};
  for (const field of MEAL_FORM_FIELDS) {
    if ((submitAttempted || touched[field]) && allErrors[field]) {
      errors[field] = allErrors[field];
    }
  }

  const setField = useCallback(
    <F extends MealFormField>(field: F, value: MealFormValues[F]) => {
      setValues((current) => ({ ...current, [field]: value }));
      setSaveError(null);
    },
    [],
  );

  const markTouched = useCallback((field: MealFormField) => {
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }));
  }, []);

  const reset = useCallback((nextValues: MealFormValues) => {
    setValues(nextValues);
    setBaseline(nextValues);
    setTouched({});
    setSubmitAttempted(false);
    setSaveError(null);
  }, []);

  const submit = (
    save: (input: MealInput) => Promise<Meal>,
  ): Promise<MealFormSubmitResult | undefined> =>
    singleFlight.run(async () => {
      setSubmitAttempted(true);
      setSaveError(null);
      if (!validateMealForm(values, todayKey).ok) {
        return submitMealForm(values, { todayKey, save });
      }
      setIsSaving(true);
      try {
        const result = await submitMealForm(values, { todayKey, save });
        if (result.status === 'failed') {
          setSaveError(result.message);
        }
        return result;
      } finally {
        setIsSaving(false);
      }
    });

  return {
    values,
    errors,
    todayKey,
    isSaving,
    saveError,
    isDirty: !areMealFormValuesEqual(values, baseline),
    setField,
    markTouched,
    reset,
    submit,
  };
}
