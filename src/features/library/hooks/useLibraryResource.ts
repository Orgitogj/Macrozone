import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { getLibraryErrorMessage } from '@/features/library/services/libraryActions';
import {
  createLoadingResource,
  resolveLoadFailure,
  resolveLoadSuccess,
  resolveRetry,
  type AsyncResource,
} from '@/utils/asyncResource';

export function useLibraryResource<T>(load: () => Promise<T>, failureMessage: string) {
  const [resource, setResource] = useState<AsyncResource<T>>(createLoadingResource);
  const latestRequestId = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    try {
      const data = await load();
      if (requestId === latestRequestId.current) {
        setResource((current) => resolveLoadSuccess(current, data));
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('[library] Failed to load', error);
      }
      if (requestId === latestRequestId.current) {
        const message = getLibraryErrorMessage(error, failureMessage);
        setResource((current) => resolveLoadFailure(current, message));
      }
    }
  }, [load, failureMessage]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const retry = useCallback(() => {
    setResource(resolveRetry);
    void reload();
  }, [reload]);

  return { resource, reload, retry, setResource };
}
