import { useEffect, useState } from 'react';

import { getDiaryLogService } from '@/features/meals/services/diaryLogActions';
import type { MealEntrySource } from '@/features/meals/types';

export function useMealEntrySource(mealId: string | undefined) {
  const [source, setSource] = useState<MealEntrySource | null>(null);

  useEffect(() => {
    let active = true;
    setSource(null);
    if (mealId === undefined) {
      return;
    }
    getDiaryLogService()
      .getEntrySource(mealId)
      .then((value) => {
        if (active) {
          setSource(value);
        }
      })
      .catch((error: unknown) => {
        if (__DEV__) {
          console.warn('[meals] Failed to load entry source', error);
        }
      });
    return () => {
      active = false;
    };
  }, [mealId]);

  return source;
}
