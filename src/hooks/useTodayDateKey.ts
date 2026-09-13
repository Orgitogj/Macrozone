import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getTodayDateKey, type LocalDateKey } from '@/utils/date';

export function useTodayDateKey(): LocalDateKey {
  const [todayKey, setTodayKey] = useState(() => getTodayDateKey());

  useFocusEffect(
    useCallback(() => {
      setTodayKey(getTodayDateKey());
    }, []),
  );

  return todayKey;
}
