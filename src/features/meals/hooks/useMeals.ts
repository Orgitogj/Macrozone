import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

import {
  clearAllMeals,
  deleteMeal,
  getMeals,
  MealStorageError,
} from '@/features/meals/storage/mealStorage';
import type { Meal } from '@/features/meals/types';
import { confirmDestructiveAction } from '@/utils/confirm';

type LoadStatus = 'loading' | 'ready' | 'error';

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof MealStorageError ? error.message : fallback;
}

export function useMeals() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const latestRequestId = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    try {
      const data = await getMeals();
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
          toErrorMessage(error, 'Could not load your meals. Please try again.'),
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

  const requestDeleteMeal = async (meal: Meal) => {
    const confirmed = await confirmDestructiveAction({
      title: 'Delete Meal',
      message: `Are you sure you want to delete "${meal.name}"?`,
      confirmLabel: 'Delete',
    });
    if (!confirmed) {
      return;
    }
    try {
      await deleteMeal(meal.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert(
        'Error',
        toErrorMessage(error, 'Could not delete the meal. Please try again.'),
      );
    }
    await reload();
  };

  const clearAll = async () => {
    try {
      await clearAllMeals();
    } catch (error) {
      Alert.alert(
        'Error',
        toErrorMessage(error, 'Could not clear your meals. Please try again.'),
      );
    }
    await reload();
  };

  return { meals, status, errorMessage, retry, requestDeleteMeal, clearAll };
}
