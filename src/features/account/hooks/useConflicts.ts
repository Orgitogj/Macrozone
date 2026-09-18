import { useCallback, useEffect, useRef, useState } from 'react';

import { syncErrorMessage } from '@/features/account/services/accountServices';
import { getAccountServices } from '@/features/account/services/getAccountServices';
import type { SyncConflict, SyncConflictResolution } from '@/features/sync/types';
import {
  createLoadingResource,
  resolveLoadFailure,
  resolveLoadSuccess,
  resolveRetry,
  type AsyncResource,
} from '@/utils/asyncResource';

export type ConflictsView = {
  resource: AsyncResource<SyncConflict[]>;
  refresh: () => void;
  retry: () => void;
  resolvingId: string | null;
  resolveError: string | null;
  resolve: (conflictId: string, resolution: SyncConflictResolution) => Promise<boolean>;
};

export function useConflicts(): ConflictsView {
  const services = getAccountServices();
  const [resource, setResource] = useState<AsyncResource<SyncConflict[]>>(createLoadingResource<SyncConflict[]>);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const requestId = useRef(0);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const load = useCallback(async () => {
    const token = requestId.current + 1;
    requestId.current = token;
    try {
      const conflicts = await services.listConflicts();
      if (!mounted.current || requestId.current !== token) {
        return;
      }
      setResource((current) => resolveLoadSuccess(current, conflicts));
    } catch (error) {
      if (!mounted.current || requestId.current !== token) {
        return;
      }
      setResource((current) => resolveLoadFailure(current, syncErrorMessage(error)));
    }
  }, [services]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  const retry = useCallback(() => {
    setResource((current) => resolveRetry(current));
    void load();
  }, [load]);

  const resolve = useCallback(
    async (conflictId: string, resolution: SyncConflictResolution): Promise<boolean> => {
      if (resolvingId !== null) {
        return false;
      }
      setResolvingId(conflictId);
      setResolveError(null);
      try {
        await services.resolveConflict(conflictId, resolution);
        await load();
        return true;
      } catch (error) {
        if (mounted.current) {
          setResolveError(syncErrorMessage(error));
        }
        return false;
      } finally {
        if (mounted.current) {
          setResolvingId(null);
        }
      }
    },
    [load, resolvingId, services],
  );

  return { resource, refresh, retry, resolvingId, resolveError, resolve };
}
