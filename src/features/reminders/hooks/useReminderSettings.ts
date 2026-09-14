import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { REMINDER_MESSAGES } from '@/features/reminders/constants';
import { getReminderService } from '@/features/reminders/services/getReminderService';
import type { ReminderActionResult, ReminderId, ReminderOverview } from '@/features/reminders/types';
import { buildReminderCardModels, type ReminderProblem } from '@/features/reminders/utils/reminderCards';
import { reminderTimeFromDate } from '@/features/reminders/utils/reminderNotifications';
import {
  createLoadingResource,
  resolveLoadFailure,
  resolveLoadSuccess,
  resolveRetry,
  type AsyncResource,
} from '@/utils/asyncResource';
import { createSingleFlight } from '@/utils/singleFlight';

export function useReminderSettings() {
  const [service] = useState(getReminderService);
  const [resource, setResource] = useState<AsyncResource<ReminderOverview>>(createLoadingResource);
  const [pendingId, setPendingId] = useState<ReminderId | null>(null);
  const [problems, setProblems] = useState<Partial<Record<ReminderId, ReminderProblem>>>({});
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionFlight] = useState(createSingleFlight);
  const latestRequestId = useRef(0);

  const refresh = useCallback(async () => {
    if (!service) {
      return;
    }
    const requestId = ++latestRequestId.current;
    try {
      const overview = await service.reconcile();
      if (requestId === latestRequestId.current) {
        setResource((current) => resolveLoadSuccess(current, overview));
      }
    } catch (error) {
      if (requestId === latestRequestId.current) {
        const message = error instanceof Error ? error.message : REMINDER_MESSAGES.loadFailed;
        setResource((current) => resolveLoadFailure(current, message));
      }
    }
  }, [service]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (!service) {
      return;
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });
    return () => subscription.remove();
  }, [service, refresh]);

  const applyResult = (id: ReminderId, result: ReminderActionResult, retry: () => void) => {
    if (result.overview) {
      const overview = result.overview;
      setResource((current) => resolveLoadSuccess(current, overview));
    }
    setProblems((current) => {
      const next = { ...current };
      if (result.outcome === 'success') {
        delete next[id];
      } else if (result.outcome === 'permission_denied') {
        next[id] = { message: REMINDER_MESSAGES.permissionDenied, retry: null };
      } else {
        next[id] = { message: result.message, retry };
      }
      return next;
    });
    setActionNotice(result.outcome === 'success' ? result.warning : null);
  };

  const runAction = (id: ReminderId, action: () => Promise<ReminderActionResult>) =>
    actionFlight.run(async () => {
      latestRequestId.current += 1;
      setPendingId(id);
      try {
        const result = await action();
        applyResult(id, result, () => void runAction(id, action));
      } finally {
        setPendingId(null);
      }
    });

  const setReminderEnabled = (id: ReminderId, enabled: boolean) => {
    if (!service) {
      return;
    }
    void runAction(id, () => service.setReminderEnabled(id, enabled));
  };

  const changeReminderTime = (id: ReminderId, selected: Date) => {
    if (!service) {
      return;
    }
    const { hour, minute } = reminderTimeFromDate(selected);
    void runAction(id, () => service.changeReminderTime(id, hour, minute));
  };

  const openSystemSettings = async () => {
    if (!service) {
      return;
    }
    const opened = await service.openSystemSettings();
    setActionNotice(opened ? null : REMINDER_MESSAGES.openSettingsFailed);
  };

  const retry = () => {
    setResource(resolveRetry);
    void refresh();
  };

  const overview = resource.status === 'ready' ? resource.data : null;

  return {
    supported: service !== null,
    resource,
    cards: overview ? buildReminderCardModels(overview, problems, pendingId, new Date()) : [],
    isBusy: pendingId !== null,
    actionNotice,
    refresh: retry,
    setReminderEnabled,
    changeReminderTime,
    openSystemSettings: () => void openSystemSettings(),
  };
}
