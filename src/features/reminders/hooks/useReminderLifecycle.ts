import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getReminderPlatform } from '@/features/reminders/services/getReminderPlatform';
import { getReminderService } from '@/features/reminders/services/getReminderService';
import {
  createReminderResponseHandler,
  type ReminderNotificationResponse,
} from '@/features/reminders/utils/reminderResponses';
import { getTodayDateKey } from '@/utils/date';

const handleReminderResponse = createReminderResponseHandler(() => getTodayDateKey());

function logLifecycleError(message: string, error: unknown) {
  if (__DEV__) {
    console.warn(`[reminders] ${message}`, error);
  }
}

export function useReminderLifecycle(appReady: boolean) {
  const router = useRouter();

  useEffect(() => {
    const platform = getReminderPlatform();
    if (!platform.supported) {
      return;
    }
    try {
      platform.responses.configureForegroundPresentation();
    } catch (error) {
      logLifecycleError('Failed to configure notification presentation', error);
    }
  }, []);

  useEffect(() => {
    const platform = getReminderPlatform();
    const service = getReminderService();
    if (!appReady || !platform.supported || !service) {
      return;
    }
    const { responses } = platform;

    const processResponse = (response: ReminderNotificationResponse | null) => {
      try {
        const handled = handleReminderResponse(response, (route) => router.push(route));
        if (handled) {
          responses.clearLastResponse();
        }
      } catch (error) {
        logLifecycleError('Failed to handle a notification response', error);
      }
    };

    const reconcile = () => {
      service.reconcileIfConfigured().catch((error: unknown) => {
        logLifecycleError('Failed to reconcile reminders', error);
      });
    };

    let unsubscribe = () => {};
    try {
      processResponse(responses.getLastResponse());
      unsubscribe = responses.subscribe(processResponse);
    } catch (error) {
      logLifecycleError('Failed to listen for notification responses', error);
    }

    reconcile();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        reconcile();
      }
    });

    return () => {
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [appReady, router]);
}
