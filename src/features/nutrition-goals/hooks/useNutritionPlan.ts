import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import {
  getNutritionPlanErrorMessage,
  loadNutritionPlan,
  skipGoalSetup,
} from '@/features/nutrition-goals/services/nutritionPlanActions';
import type { NutritionPlan } from '@/features/nutrition-goals/types';

type PlanState =
  | { status: 'loading'; plan: null }
  | { status: 'ready'; plan: NutritionPlan }
  | { status: 'error'; plan: null; message: string };

export function useNutritionPlan() {
  const [state, setState] = useState<PlanState>({ status: 'loading', plan: null });
  const latestRequestId = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    try {
      const plan = await loadNutritionPlan();
      if (requestId === latestRequestId.current) {
        setState({ status: 'ready', plan });
      }
    } catch (error) {
      if (requestId === latestRequestId.current) {
        setState({
          status: 'error',
          plan: null,
          message: getNutritionPlanErrorMessage(error, 'Could not load your nutrition goals.'),
        });
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const retry = () => {
    setState({ status: 'loading', plan: null });
    void reload();
  };

  const dismissPersonalization = async () => {
    try {
      const plan = await skipGoalSetup();
      setState({ status: 'ready', plan });
    } catch {
      await reload();
    }
  };

  return { state, retry, reload, dismissPersonalization };
}
