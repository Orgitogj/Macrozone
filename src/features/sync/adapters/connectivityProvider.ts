import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';

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

export function createExpoConnectivityProvider(): ConnectivityProvider {
  return {
    isOnline: async () => {
      try {
        return isOnlineState(await getNetworkStateAsync());
      } catch {
        return true;
      }
    },
    subscribe: (listener) => {
      const subscription = addNetworkStateListener((state) => {
        listener(isOnlineState(state));
      });
      return () => subscription.remove();
    },
  };
}
