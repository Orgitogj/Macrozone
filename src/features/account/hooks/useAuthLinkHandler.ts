import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { getAccountServices } from '@/features/account/services/getAccountServices';

export function useAuthLinkHandler(enabled: boolean): void {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const services = getAccountServices();
    let cancelled = false;

    const handle = async (url: string | null) => {
      if (url === null || url.length === 0) {
        return;
      }
      const outcome = await services.handleAuthLink(url);
      if (cancelled) {
        return;
      }
      switch (outcome.status) {
        case 'signed_in':
          router.replace('/account');
          return;
        case 'reset_password':
          router.replace('/auth/reset-password');
          return;
        case 'failed':
          router.replace(outcome.code === 'link_expired' ? '/auth/forgot-password' : '/auth/sign-in');
          return;
        default:
          return;
      }
    };

    void Linking.getInitialURL()
      .then((url) => handle(url))
      .catch(() => undefined);
    const subscription = Linking.addEventListener('url', (event) => {
      void handle(event.url);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [enabled, router]);
}
