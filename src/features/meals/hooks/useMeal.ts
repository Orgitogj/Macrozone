import { useCallback, useEffect, useRef, useState } from 'react';

import { getMealErrorMessage } from '@/features/meals/services/mealActions';
import { getMealById } from '@/features/meals/storage/mealStorage';
import type { Meal } from '@/features/meals/types';

type MealLoadState =
  | { status: 'loading' }
  | { status: 'ready'; meal: Meal }
  | { status: 'missing' }
  | { status: 'error'; message: string };

export function useMeal(id: string | undefined) {
  const [state, setState] = useState<MealLoadState>({ status: 'loading' });
  const latestRequestId = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    if (id === undefined) {
      setState({ status: 'missing' });
      return;
    }
    setState({ status: 'loading' });
    try {
      const meal = await getMealById(id);
      if (requestId === latestRequestId.current) {
        setState(meal ? { status: 'ready', meal } : { status: 'missing' });
      }
    } catch (error) {
      if (requestId === latestRequestId.current) {
        setState({
          status: 'error',
          message: getMealErrorMessage(error, 'Could not load this meal. Please try again.'),
        });
      }
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}
