import { useCallback, useEffect, useRef, useState } from 'react';

import { getAccountServices } from '@/features/account/services/getAccountServices';
import type {
  GuestDataCounts,
  GuestImportDecision,
  GuestImportProgress,
  GuestImportSummary,
} from '@/features/account/services/guestImportService';
import { GuestImportError } from '@/features/account/services/guestImportService';
import {
  createLoadingResource,
  resolveLoadFailure,
  resolveLoadSuccess,
  resolveRetry,
  type AsyncResource,
} from '@/utils/asyncResource';

export type GuestDataDescription = { datasetId: string; counts: GuestDataCounts; decision: GuestImportDecision | null };

export type GuestImportPhase = 'idle' | 'importing' | 'imported' | 'failed';

export type GuestImportView = {
  resource: AsyncResource<GuestDataDescription | null>;
  retry: () => void;
  phase: GuestImportPhase;
  progress: GuestImportProgress | null;
  summary: GuestImportSummary | null;
  errorMessage: string | null;
  busy: boolean;
  startImport: () => void;
  keepSeparate: () => void;
  decideLater: () => void;
};

function messageOf(error: unknown): string {
  return error instanceof GuestImportError ? error.message : 'MacroZone could not finish that. Please try again.';
}

export function useGuestImport(enabled = true): GuestImportView {
  const services = getAccountServices();
  const [resource, setResource] = useState<AsyncResource<GuestDataDescription | null>>(
    createLoadingResource<GuestDataDescription | null>,
  );
  const [phase, setPhase] = useState<GuestImportPhase>('idle');
  const [progress, setProgress] = useState<GuestImportProgress | null>(null);
  const [summary, setSummary] = useState<GuestImportSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const load = useCallback(async () => {
    const guestImport = services.guestImport;
    if (!enabled || guestImport === null) {
      setResource((current) => resolveLoadSuccess(current, null));
      return;
    }
    try {
      const description = await guestImport.describeGuestData();
      if (mounted.current) {
        setResource((current) => resolveLoadSuccess(current, description));
      }
    } catch (error) {
      if (mounted.current) {
        setResource((current) => resolveLoadFailure(current, messageOf(error)));
      }
    }
  }, [enabled, services]);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = useCallback(() => {
    setResource((current) => resolveRetry(current));
    void load();
  }, [load]);

  const startImport = useCallback(() => {
    if (running.current) {
      return;
    }
    running.current = true;
    setBusy(true);
    setPhase('importing');
    setErrorMessage(null);
    setProgress(null);
    void (async () => {
      try {
        const result = await services.importGuestData((update) => {
          if (mounted.current) {
            setProgress(update);
          }
        });
        if (mounted.current) {
          setSummary(result);
          setPhase(result === null ? 'failed' : 'imported');
          setErrorMessage(result === null ? 'Importing is not available on this device.' : null);
        }
        await load();
      } catch (error) {
        if (mounted.current) {
          setPhase('failed');
          setErrorMessage(messageOf(error));
        }
      } finally {
        running.current = false;
        if (mounted.current) {
          setBusy(false);
        }
      }
    })();
  }, [load, services]);

  const decide = useCallback(
    (decision: 'declined' | 'deferred') => {
      const guestImport = services.guestImport;
      const description = resource.status === 'ready' ? resource.data : null;
      if (guestImport === null || description === null || running.current) {
        return;
      }
      running.current = true;
      setBusy(true);
      setErrorMessage(null);
      void (async () => {
        try {
          if (decision === 'declined') {
            await guestImport.decline(description.datasetId);
          } else {
            await guestImport.decideLater(description.datasetId);
          }
          await load();
        } catch (error) {
          if (mounted.current) {
            setErrorMessage(messageOf(error));
          }
        } finally {
          running.current = false;
          if (mounted.current) {
            setBusy(false);
          }
        }
      })();
    },
    [load, resource, services],
  );

  const keepSeparate = useCallback(() => decide('declined'), [decide]);

  const decideLater = useCallback(() => decide('deferred'), [decide]);

  return { resource, retry, phase, progress, summary, errorMessage, busy, startImport, keepSeparate, decideLater };
}
