import { useCallback, useRef, useState } from 'react';

import { useAccountSession } from '@/features/account/hooks/useAccountSession';
import { getAccountServices } from '@/features/account/services/getAccountServices';
import { describeSyncError, deriveSyncStatus, describeLastSync, type SyncStatus } from '@/features/sync/utils/syncStatus';

export type SyncStatusView = {
  status: SyncStatus;
  signedIn: boolean;
  configured: boolean;
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  conflictCount: number;
  lastSyncLabel: string;
  failureMessage: string | null;
  syncNow: () => void;
  refresh: () => void;
};

export function useSyncStatus(): SyncStatusView {
  const services = getAccountServices();
  const state = useAccountSession();
  const [, setTick] = useState(0);
  const running = useRef(false);

  const syncNow = useCallback(() => {
    if (running.current) {
      return;
    }
    running.current = true;
    void services
      .syncNow()
      .catch(() => undefined)
      .finally(() => {
        running.current = false;
        setTick((value) => value + 1);
      });
  }, [services]);

  const refresh = useCallback(() => {
    void services.refresh().catch(() => undefined);
  }, [services]);

  const signedIn = state.status === 'signed_in';
  const status = deriveSyncStatus({
    configured: state.configured,
    signedIn,
    phase: state.phase,
    online: state.online,
    summary: state.summary,
  });
  const failureCode = state.summary?.lastErrorCode ?? null;

  return {
    status,
    signedIn,
    configured: state.configured,
    online: state.online,
    syncing: state.phase === 'syncing',
    pendingCount: state.summary?.pendingCount ?? 0,
    conflictCount: state.summary?.conflictCount ?? 0,
    lastSyncLabel: describeLastSync(state.summary?.lastSuccessAt ?? null, new Date()),
    failureMessage: status.kind === 'attention_required' ? null : describeSyncError(failureCode),
    syncNow,
    refresh,
  };
}
