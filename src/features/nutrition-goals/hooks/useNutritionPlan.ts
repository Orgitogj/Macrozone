import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import {
  getNutritionPlanErrorMessage,
  loadNutritionPlan,
  skipGoalSetup,
} from '@/features/nutrition-goals/services/nutritionPlanActions';
import type { NutritionPlan } from '@/features/nutrition-goals/types';
import {
  createLoadingResource,
  resolveLoadFailure,
  resolveLoadSuccess,
  resolveRetry,
  type AsyncResource,
} from '@/utils/asyncResource';

export function useNutritionPlan() {
  const [resource, setResource] = useState<AsyncResource<NutritionPlan>>(createLoadingResource);
  const latestRequestId = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    try {
      const plan = await loadNutritionPlan();
      if (requestId === latestRequestId.current) {
        setResource((current) => resolveLoadSuccess(current, plan));
      }
    } catch (error) {
      if (requestId === latestRequestId.current) {
        const message = getNutritionPlanErrorMessage(error, 'Could not load your nutrition goals.');
        setResource((current) => resolveLoadFailure(current, message));
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const retry = () => {
    setResource(resolveRetry);
    void reload();
  };

  const dismissPersonalization = async () => {
    try {
      const plan = await skipGoalSetup();
      setResource((current) => resolveLoadSuccess(current, plan));
    } catch {
      await reload();
    }
  };

  return { resource, retry, reload, dismissPersonalization };
}
