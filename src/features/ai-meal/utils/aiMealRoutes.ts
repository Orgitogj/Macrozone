import type { AiInputKind } from '@/features/ai-meal/types';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { getSingleParam } from '@/utils/routeParams';

export function parseAiInputParam(value: string | string[] | undefined): AiInputKind {
  return getSingleParam(value) === 'photo' ? 'photo' : 'text';
}

export function buildAiMealRouteParams(
  destination: LogDestination,
  input: AiInputKind,
): { date: string; mealType: string; input: AiInputKind } {
  return { date: destination.date, mealType: destination.mealType, input };
}
