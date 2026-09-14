import { useRouter } from 'expo-router';

export function useGoalsNavigation() {
  const router = useRouter();

  return {
    openGoals: () => router.push('/goals'),
    openCalculator: () => router.push('/goals/calculate'),
    openManualEditor: () => router.push('/goals/edit'),
    close: () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.navigate('/');
      }
    },
  };
}
