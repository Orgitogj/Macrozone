export type ConnectivitySnapshot = { online: boolean };

export type ConnectivityProvider = {
  isOnline(): Promise<boolean>;
  subscribe(listener: (online: boolean) => void): () => void;
};

export function isOnlineState(state: { isConnected?: boolean | null; isInternetReachable?: boolean | null }): boolean {
  if (state.isConnected === false) {
    return false;
  }
  return state.isInternetReachable !== false;
}

type BrowserWindow = {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};

function browserWindow(): BrowserWindow | null {
  const candidate = globalThis as unknown as { addEventListener?: unknown; removeEventListener?: unknown };
  return typeof candidate.addEventListener === 'function' && typeof candidate.removeEventListener === 'function'
    ? (candidate as BrowserWindow)
    : null;
}

function readOnline(): boolean {
  const navigatorState = (globalThis as { navigator?: { onLine?: boolean } }).navigator;
  return navigatorState?.onLine !== false;
}

export function createExpoConnectivityProvider(): ConnectivityProvider {
  return {
    isOnline: () => Promise.resolve(readOnline()),
    subscribe: (listener) => {
      const target = browserWindow();
      if (target === null) {
        return () => undefined;
      }
      const onOnline = () => listener(true);
      const onOffline = () => listener(false);
      target.addEventListener('online', onOnline);
      target.addEventListener('offline', onOffline);
      return () => {
        target.removeEventListener('online', onOnline);
        target.removeEventListener('offline', onOffline);
      };
    },
  };
}
