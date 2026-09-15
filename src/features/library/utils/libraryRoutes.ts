import { parseNewMealRouteParams } from '@/features/meals/utils/mealRoutes';
import { inferMealTypeFromDate } from '@/features/meals/utils/mealType';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import type { LocalDateKey } from '@/utils/date';
import { getSingleParam } from '@/utils/routeParams';

type RawParam = string | string[] | undefined;

const ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

export function parseLibraryIdParam(value: RawParam): string | null {
  const id = getSingleParam(value);
  return id !== undefined && ID_PATTERN.test(id) ? id : null;
}

export function resolveLogDestination(
  params: { date?: RawParam; mealType?: RawParam },
  todayKey: LocalDateKey,
  now: Date,
): LogDestination {
  const parsed = parseNewMealRouteParams(params, todayKey);
  return {
    date: parsed.date ?? todayKey,
    mealType: parsed.mealType ?? inferMealTypeFromDate(now),
  };
}

export function buildDestinationParams(destination: LogDestination): { date: string; mealType: string } {
  return { date: destination.date, mealType: destination.mealType };
}

export function parsePositiveAmountParam(value: RawParam): number | null {
  const text = getSingleParam(value);
  if (text === undefined || !/^\d{1,6}(\.\d{1,2})?$/.test(text)) {
    return null;
  }
  const amount = Number(text);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
