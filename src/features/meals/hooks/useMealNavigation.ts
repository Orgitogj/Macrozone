import { useRouter } from 'expo-router';

import type { LocalDateKey } from '@/utils/date';

export function useMealNavigation() {
  const router = useRouter();

  return {
    openMeal: (id: string) => {
      router.push({ pathname: '/meal/[id]', params: { id } });
    },
    openDuplicate: (id: string) => {
      router.push({ pathname: '/meal/new', params: { duplicateOf: id } });
    },
    showDay: (date: LocalDateKey) => {
      const href = { pathname: '/' as const, params: { date } };
      if (router.canDismiss()) {
        router.dismissTo(href);
      } else {
        router.navigate(href);
      }
    },
    goBack: () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.navigate('/');
      }
    },
  };
}
