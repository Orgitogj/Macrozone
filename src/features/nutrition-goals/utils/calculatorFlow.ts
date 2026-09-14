import type { BodyProfileStep } from '@/features/profile/validation/bodyProfileForm';

export const CALCULATOR_STEPS = ['body', 'activity', 'goal', 'review'] as const;

export type CalculatorStep = (typeof CALCULATOR_STEPS)[number] | 'adjust';

export type CalculatorFlowState = {
  step: CalculatorStep;
};

export type CalculatorFlowAction =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'adjust' }
  | { type: 'reset' };

export const INITIAL_CALCULATOR_FLOW_STATE: CalculatorFlowState = { step: 'body' };

const NEXT_STEP: Readonly<Record<CalculatorStep, CalculatorStep>> = {
  body: 'activity',
  activity: 'goal',
  goal: 'review',
  review: 'review',
  adjust: 'adjust',
};

const PREVIOUS_STEP: Readonly<Record<CalculatorStep, CalculatorStep | null>> = {
  body: null,
  activity: 'body',
  goal: 'activity',
  review: 'goal',
  adjust: 'review',
};

export function calculatorFlowReducer(
  state: CalculatorFlowState,
  action: CalculatorFlowAction,
): CalculatorFlowState {
  switch (action.type) {
    case 'next':
      return { step: NEXT_STEP[state.step] };
    case 'back': {
      const previous = PREVIOUS_STEP[state.step];
      return previous === null ? state : { step: previous };
    }
    case 'adjust':
      return state.step === 'review' ? { step: 'adjust' } : state;
    case 'reset':
      return INITIAL_CALCULATOR_FLOW_STATE;
  }
}

export function isFirstCalculatorStep(step: CalculatorStep): boolean {
  return PREVIOUS_STEP[step] === null;
}

export function getCalculatorStepPosition(step: CalculatorStep): { current: number; total: number } {
  const index = CALCULATOR_STEPS.indexOf(step === 'adjust' ? 'review' : step);
  return { current: index + 1, total: CALCULATOR_STEPS.length };
}

export function toProfileStep(step: CalculatorStep): BodyProfileStep | null {
  return step === 'body' || step === 'activity' || step === 'goal' ? step : null;
}
