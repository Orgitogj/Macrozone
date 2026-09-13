import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTodayDateKey } from '@/hooks/useTodayDateKey';
import {
  addDaysToDateKey,
  compareDateKeys,
  resolveSelectedDateKey,
  type LocalDateKey,
} from '@/utils/date';

export function useSelectedDate() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const router = useRouter();
  const todayKey = useTodayDateKey();

  const selectedDateKey = resolveSelectedDateKey(date, todayKey);
  const canGoToNextDay = compareDateKeys(selectedDateKey, todayKey) < 0;

  const selectDate = (key: LocalDateKey) => {
    router.setParams({ date: resolveSelectedDateKey(key, todayKey) });
  };

  return {
    selectedDateKey,
    todayKey,
    isToday: selectedDateKey === todayKey,
    canGoToNextDay,
    goToPreviousDay: () => selectDate(addDaysToDateKey(selectedDateKey, -1)),
    goToNextDay: () => {
      if (canGoToNextDay) {
        selectDate(addDaysToDateKey(selectedDateKey, 1));
      }
    },
    goToToday: () => selectDate(todayKey),
  };
}
