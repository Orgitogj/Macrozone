import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { getAiMealService } from '@/features/ai-meal/services/getAiMealService';
import type { AiInputKind } from '@/features/ai-meal/types';
import { buildAiMealRouteParams, parseAiInputParam } from '@/features/ai-meal/utils/aiMealRoutes';
import { resolveLogDestination } from '@/features/library/utils/libraryRoutes';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { buildManualMealRouteParams } from '@/features/meals/utils/mealRoutes';
import { getTodayDateKey } from '@/utils/date';

export function useAiMealAvailability(): boolean {
  const [isConfigured] = useState(() => getAiMealService().isConfigured());
  return isConfigured;
}

export function useAiMealNavigation() {
  const router = useRouter();

  return {
    openAiMeal: (destination: LogDestination, input: AiInputKind) =>
      router.push({ pathname: '/ai-meal', params: buildAiMealRouteParams(destination, input) }),
    replaceWithManual: (destination: LogDestination) =>
      router.replace({ pathname: '/meal/new', params: buildManualMealRouteParams(destination) }),
  };
}

export function useAiMealRouteParams(): { destination: LogDestination; input: AiInputKind } {
  const params = useLocalSearchParams<{ date?: string; mealType?: string; input?: string }>();
  const [route] = useState(() => ({
    destination: resolveLogDestination(params, getTodayDateKey(), new Date()),
    input: parseAiInputParam(params.input),
  }));
  return route;
}
