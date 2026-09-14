import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { countLoggedMeals } from '@/features/meals/services/mealActions';
import { MealRepositoryError } from '@/features/meals/repositories/mealRepository';
import { NutritionPlanRepositoryError } from '@/features/nutrition-goals/repositories/nutritionPlanRepository';
import { loadNutritionPlan } from '@/features/nutrition-goals/services/nutritionPlanActions';
import { shouldShowOnboarding } from '@/features/onboarding/onboardingGate';

export type OnboardingGateState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; needsOnboarding: boolean };

type OnboardingGateContextValue = {
  state: OnboardingGateState;
  refresh: () => Promise<void>;
  retry: () => void;
};

const OnboardingGateContext = createContext<OnboardingGateContextValue | null>(null);

function toGateErrorMessage(error: unknown): string {
  if (error instanceof MealRepositoryError || error instanceof NutritionPlanRepositoryError) {
    return error.message;
  }
  return 'Could not prepare MacroZone. Please try again.';
}

export function OnboardingGateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingGateState>({ status: 'loading' });

  const refresh = useCallback(async () => {
    try {
      const [plan, mealCount] = await Promise.all([loadNutritionPlan(), countLoggedMeals()]);
      setState({ status: 'ready', needsOnboarding: shouldShowOnboarding({ plan, mealCount }) });
    } catch (error) {
      if (__DEV__) {
        console.warn('[onboarding] Failed to evaluate onboarding state', error);
      }
      setState((current) =>
        current.status === 'ready' ? current : { status: 'error', message: toGateErrorMessage(error) },
      );
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    void refresh();
  }, [refresh]);

  return (
    <OnboardingGateContext.Provider value={{ state, refresh, retry }}>{children}</OnboardingGateContext.Provider>
  );
}

export function useOnboardingGate(): OnboardingGateContextValue {
  const context = useContext(OnboardingGateContext);
  if (context === null) {
    throw new Error('useOnboardingGate must be used inside OnboardingGateProvider.');
  }
  return context;
}
