import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

import {
  confirmAndClearDay,
  confirmAndDeleteAllMeals,
  confirmAndDeleteMeal,
  getMealErrorMessage,
  loadAllMeals,
  type DestructiveActionResult,
} from '@/features/meals/services/mealActions';
import type { Meal } from '@/features/meals/types';
import type { LocalDateKey } from '@/utils/date';

type LoadStatus = 'loading' | 'ready' | 'error';

export function useMeals() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const latestRequestId = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    try {
      const data = await loadAllMeals();
      if (requestId === latestRequestId.current) {
        setMeals(data);
        setErrorMessage(null);
        setStatus('ready');
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('[meals] Failed to load meals', error);
      }
      if (requestId === latestRequestId.current) {
        setErrorMessage(
          getMealErrorMessage(error, 'Could not load your meals. Please try again.'),
        );
        setStatus('error');
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const retry = () => {
    setStatus('loading');
    void reload();
  };

  const runDestructiveAction = async (
    action: () => Promise<DestructiveActionResult>,
    failureMessage: string,
  ) => {
    try {
      if ((await action()) === 'completed') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert('Error', getMealErrorMessage(error, failureMessage));
    }
    await reload();
  };

  const requestDeleteMeal = (meal: Meal) =>
    runDestructiveAction(
      () => confirmAndDeleteMeal(meal),
      'Could not delete the meal. Please try again.',
    );

  const requestClearDay = (dateKey: LocalDateKey, todayKey: LocalDateKey) =>
    runDestructiveAction(
      () =>
        confirmAndClearDay({
          dateKey,
          todayKey,
          mealCount: meals.filter((meal) => meal.date === dateKey).length,
        }),
      'Could not clear this day. Please try again.',
    );

  const requestDeleteAllHistory = () =>
    runDestructiveAction(
      () => confirmAndDeleteAllMeals(meals.length),
      'Could not delete your meal history. Please try again.',
    );

  return {
    meals,
    status,
    errorMessage,
    retry,
    requestDeleteMeal,
    requestClearDay,
    requestDeleteAllHistory,
  };
}
