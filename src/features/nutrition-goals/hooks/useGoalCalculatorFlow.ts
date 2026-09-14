import { useReducer, useState } from 'react';

import {
  getNutritionPlanErrorMessage,
  saveAdjustedGoals,
  saveCalculatedGoals,
} from '@/features/nutrition-goals/services/nutritionPlanActions';
import type { DailyNutritionGoals, NutritionPlan } from '@/features/nutrition-goals/types';
import {
  calculatorFlowReducer,
  INITIAL_CALCULATOR_FLOW_STATE,
  isFirstCalculatorStep,
  toProfileStep,
} from '@/features/nutrition-goals/utils/calculatorFlow';
import { calculateNutritionTargets } from '@/features/nutrition-goals/utils/goalCalculator';
import type { BodyProfile, UnitSystem } from '@/features/profile/types';
import {
  bodyProfileToFormValues,
  convertBodyProfileFormUnits,
  createEmptyBodyProfileFormValues,
  pickStepErrors,
  validateBodyProfileForm,
  type BodyProfileErrors,
  type BodyProfileFormValues,
  type BodyProfileStep,
} from '@/features/profile/validation/bodyProfileForm';
import { createSingleFlight } from '@/utils/singleFlight';

export function useGoalCalculatorFlow({
  initialProfile,
  onSaved,
  onExit,
}: {
  initialProfile: BodyProfile | null;
  onSaved: (plan: NutritionPlan) => void;
  onExit: () => void;
}) {
  const [flowState, dispatch] = useReducer(calculatorFlowReducer, INITIAL_CALCULATOR_FLOW_STATE);
  const [values, setValues] = useState<BodyProfileFormValues>(() =>
    initialProfile ? bodyProfileToFormValues(initialProfile) : createEmptyBodyProfileFormValues(),
  );
  const [attemptedSteps, setAttemptedSteps] = useState<Partial<Record<BodyProfileStep, boolean>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flight] = useState(createSingleFlight);

  const validation = validateBodyProfileForm(values);
  const calculation = validation.ok ? calculateNutritionTargets(validation.input) : null;
  const profileStep = toProfileStep(flowState.step);
  const errors: BodyProfileErrors =
    profileStep && attemptedSteps[profileStep] && !validation.ok ? pickStepErrors(validation.errors, profileStep) : {};

  const setField = <K extends keyof BodyProfileFormValues>(field: K, value: BodyProfileFormValues[K]) => {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === 'weightGoal') {
        next.weeklyRateKg = value === 'maintain' ? 0 : null;
      }
      return next;
    });
    setSaveError(null);
  };

  const setUnitSystem = (unitSystem: UnitSystem) => {
    setValues((current) => convertBodyProfileFormUnits(current, unitSystem));
  };

  const goNext = () => {
    if (profileStep) {
      setAttemptedSteps((current) => ({ ...current, [profileStep]: true }));
      const stepErrors = validation.ok ? {} : pickStepErrors(validation.errors, profileStep);
      if (Object.keys(stepErrors).length > 0) {
        return;
      }
    }
    dispatch({ type: 'next' });
  };

  const goBack = () => {
    if (isFirstCalculatorStep(flowState.step)) {
      onExit();
      return;
    }
    setSaveError(null);
    dispatch({ type: 'back' });
  };

  const persist = (save: () => Promise<NutritionPlan>) =>
    flight.run(async () => {
      setIsSaving(true);
      setSaveError(null);
      try {
        const plan = await save();
        onSaved(plan);
        return plan;
      } catch (error) {
        setSaveError(getNutritionPlanErrorMessage(error, 'Could not save your nutrition goals. Please try again.'));
        return undefined;
      } finally {
        setIsSaving(false);
      }
    });

  const saveCalculated = () => {
    if (!validation.ok) {
      return Promise.resolve(undefined);
    }
    const input = validation.input;
    return persist(() => saveCalculatedGoals(input));
  };

  const saveAdjusted = (goals: DailyNutritionGoals): Promise<NutritionPlan> => {
    if (!validation.ok) {
      return Promise.reject(new Error('Profile details are incomplete.'));
    }
    return saveAdjustedGoals(validation.input, goals);
  };

  return {
    step: flowState.step,
    values,
    errors,
    calculation,
    profileInput: validation.ok ? validation.input : null,
    isSaving,
    saveError,
    setField,
    setUnitSystem,
    goNext,
    goBack,
    startAdjusting: () => dispatch({ type: 'adjust' }),
    saveCalculated,
    saveAdjusted,
  };
}
