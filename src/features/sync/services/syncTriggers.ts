import type { ConnectivityProvider } from '@/features/sync/adapters/connectivityProvider';
import type { SyncCoordinator, SyncRunReason } from '@/features/sync/services/syncCoordinator';

export type LocalChangeNotifier = {
  notify(): void;
  subscribe(listener: () => void): () => void;
};

export function createLocalChangeNotifier(): LocalChangeNotifier {
  const listeners = new Set<() => void>();
  return {
    notify: () => {
      for (const listener of [...listeners]) {
        listener();
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

let sharedNotifier: LocalChangeNotifier | null = null;

export function getLocalChangeNotifier(): LocalChangeNotifier {
  sharedNotifier ??= createLocalChangeNotifier();
  return sharedNotifier;
}

export type AppStateSource = {
  subscribe(listener: (active: boolean) => void): () => void;
};

export function createSyncTriggers({
  coordinator,
  connectivity,
  appState,
  localChanges,
  debounceMs = 5_000,
  schedule = (task, delay) => {
    const timeout = setTimeout(task, delay);
    return () => clearTimeout(timeout);
  },
}: {
  coordinator: Pick<SyncCoordinator, 'requestSync'>;
  connectivity: ConnectivityProvider;
  appState: AppStateSource;
  localChanges: LocalChangeNotifier;
  debounceMs?: number;
  schedule?: (task: () => void, delay: number) => () => void;
}) {
  let unsubscribers: (() => void)[] = [];
  let cancelDebounce: (() => void) | null = null;
  let wasOnline = true;
  let running = false;

  const request = (reason: SyncRunReason) => {
    void coordinator.requestSync(reason).catch(() => undefined);
  };

  return {
    start: () => {
      if (running) {
        return;
      }
      running = true;
      unsubscribers = [
        appState.subscribe((active) => {
          if (active) {
            request('app_active');
          }
        }),
        connectivity.subscribe((online) => {
          if (online && !wasOnline) {
            request('connectivity');
          }
          wasOnline = online;
        }),
        localChanges.subscribe(() => {
          cancelDebounce?.();
          cancelDebounce = schedule(() => {
            cancelDebounce = null;
            request('local_change');
          }, debounceMs);
        }),
      ];
    },

    stop: () => {
      running = false;
      cancelDebounce?.();
      cancelDebounce = null;
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
      unsubscribers = [];
    },

    isRunning: () => running,
  };
}

export type SyncTriggers = ReturnType<typeof createSyncTriggers>;
