import { useRouter } from 'expo-router';

export function useReminderNavigation() {
  const router = useRouter();

  return {
    openReminders: () => router.push('/reminders'),
  };
}
