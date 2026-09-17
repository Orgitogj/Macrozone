import type { MealType } from '@/features/meals/types';
import { isMealType } from '@/features/meals/utils/mealType';
import { compareDateKeys, isLocalDateKey, type LocalDateKey } from '@/utils/date';
import { getSingleParam } from '@/utils/routeParams';

export type NewMealRouteParams = {
  duplicateOf?: string;
  date?: string;
  mealType?: string;
};

export type NewMealRouteInput = {
  duplicateOfId?: string;
  date: LocalDateKey | null;
  mealType: MealType | null;
};

type RawParam = string | string[] | undefined;

export function buildNewMealRouteParams({
  date,
  mealType,
}: {
  date: LocalDateKey;
  mealType: MealType;
}): Required<Pick<NewMealRouteParams, 'date' | 'mealType'>> {
  return { date, mealType };
}

export function parseNewMealRouteParams(
  params: { duplicateOf?: RawParam; date?: RawParam; mealType?: RawParam },
  todayKey: LocalDateKey,
): NewMealRouteInput {
  const date = getSingleParam(params.date);
  const mealType = getSingleParam(params.mealType);
  return {
    duplicateOfId: getSingleParam(params.duplicateOf),
    date: isLocalDateKey(date) && compareDateKeys(date, todayKey) <= 0 ? date : null,
    mealType: isMealType(mealType) ? mealType : null,
  };
}

export function buildManualMealRouteParams({
  date,
  mealType,
}: {
  date: LocalDateKey;
  mealType: MealType;
}): { date: string; mealType: string; mode: 'manual' } {
  return { date, mealType, mode: 'manual' };
}

export function isManualModeParam(value: RawParam): boolean {
  return getSingleParam(value) === 'manual';
}
