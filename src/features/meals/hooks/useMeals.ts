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
import { getDiaryLogService } from '@/features/meals/services/diaryLogActions';
import type { Meal } from '@/features/meals/types';
import {
  createLoadingResource,
  getResourceData,
  resolveLoadFailure,
  resolveLoadSuccess,
  resolveRetry,
  type AsyncResource,
} from '@/utils/asyncResource';
import type { LocalDateKey } from '@/utils/date';
import { createSingleFlight } from '@/utils/singleFlight';

export type MealsPendingAction = 'delete-meal' | 'clear-day' | 'delete-all' | 'copy-day' | null;

const EMPTY_MEALS: Meal[] = [];

export function useMeals() {
  const [resource, setResource] = useState<AsyncResource<Meal[]>>(createLoadingResource);
  const [pendingAction, setPendingAction] = useState<MealsPendingAction>(null);
  const [actionFlight] = useState(createSingleFlight);
  const latestRequestId = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    try {
      const data = await loadAllMeals();
      if (requestId === latestRequestId.current) {
        setResource((current) => resolveLoadSuccess(current, data));
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('[meals] Failed to load meals', error);
      }
      if (requestId === latestRequestId.current) {
        const message = getMealErrorMessage(error, 'Could not load your meals. Please try again.');
        setResource((current) => resolveLoadFailure(current, message));
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const retry = () => {
    setResource(resolveRetry);
    void reload();
  };

  const meals = getResourceData(resource) ?? EMPTY_MEALS;

  const runDestructiveAction = (
    kind: Exclude<MealsPendingAction, null>,
    action: () => Promise<DestructiveActionResult>,
    failureMessage: string,
  ) =>
    actionFlight.run(async () => {
      setPendingAction(kind);
      try {
        if ((await action()) === 'completed') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        Alert.alert('Error', getMealErrorMessage(error, failureMessage));
      } finally {
        setPendingAction(null);
      }
      await reload();
    });

  const requestDeleteMeal = (meal: Meal) =>
    runDestructiveAction('delete-meal', () => confirmAndDeleteMeal(meal), 'Could not delete the meal. Please try again.');

  const requestClearDay = (dateKey: LocalDateKey, todayKey: LocalDateKey) =>
    runDestructiveAction(
      'clear-day',
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
      'delete-all',
      () => confirmAndDeleteAllMeals(meals.length),
      'Could not delete your meal history. Please try again.',
    );

  const requestCopyDay = (sourceDate: LocalDateKey, destinationDate: LocalDateKey, todayKey: LocalDateKey) =>
    actionFlight.run(async () => {
      setPendingAction('copy-day');
      try {
        const result = await getDiaryLogService().copyDay({
          sourceDate,
          destinationDate,
          todayKey,
          mealCount: meals.filter((meal) => meal.date === sourceDate).length,
        });
        if (result.status === 'copied') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (result.status !== 'cancelled') {
          Alert.alert('Could not copy meals', result.message);
        }
        return result.status;
      } finally {
        setPendingAction(null);
        await reload();
      }
    });

  return {
    resource,
    meals,
    pendingAction,
    retry,
    requestDeleteMeal,
    requestClearDay,
    requestDeleteAllHistory,
    requestCopyDay,
  };
}
