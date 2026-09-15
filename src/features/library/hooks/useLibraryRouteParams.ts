import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import {
  parseLibraryIdParam,
  parsePositiveAmountParam,
  resolveLogDestination,
} from '@/features/library/utils/libraryRoutes';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { getTodayDateKey } from '@/utils/date';

export function useLibraryRouteParams(): { id: string | null; destination: LogDestination; amount: number | null } {
  const params = useLocalSearchParams<{ id?: string; date?: string; mealType?: string; amount?: string }>();
  const [destination] = useState(() => resolveLogDestination(params, getTodayDateKey(), new Date()));
  return {
    id: parseLibraryIdParam(params.id),
    destination,
    amount: parsePositiveAmountParam(params.amount),
  };
}
