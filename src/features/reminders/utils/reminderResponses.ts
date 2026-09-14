import { buildNewMealRouteParams } from '@/features/meals/utils/mealRoutes';
import { parseReminderNotificationData } from '@/features/reminders/utils/reminderNotifications';
import type { LocalDateKey } from '@/utils/date';

export type ReminderNotificationResponse = {
  key: string;
  isDefaultAction: boolean;
  data: unknown;
};

export type ReminderRoute = {
  pathname: '/meal/new';
  params: { date: string; mealType: string };
};

export function mapReminderResponseToRoute(data: unknown, todayKey: LocalDateKey): ReminderRoute | null {
  const reminder = parseReminderNotificationData(data);
  if (!reminder) {
    return null;
  }
  return { pathname: '/meal/new', params: buildNewMealRouteParams({ date: todayKey, mealType: reminder.mealType }) };
}

export function createReminderResponseHandler(getTodayKey: () => LocalDateKey) {
  const handled = new Set<string>();

  return (
    response: ReminderNotificationResponse | null,
    navigate: (route: ReminderRoute) => void,
  ): boolean => {
    if (response === null || handled.has(response.key)) {
      return false;
    }
    handled.add(response.key);
    if (!response.isDefaultAction) {
      return false;
    }
    const route = mapReminderResponseToRoute(response.data, getTodayKey());
    if (!route) {
      return false;
    }
    navigate(route);
    return true;
  };
}
