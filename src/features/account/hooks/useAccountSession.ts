import { useSyncExternalStore } from 'react';

import type { AccountUiState } from '@/features/account/services/accountServices';
import { getAccountServices } from '@/features/account/services/getAccountServices';

export function useAccountSession(): AccountUiState {
  const services = getAccountServices();
  return useSyncExternalStore(services.subscribe, services.getState, services.getState);
}
