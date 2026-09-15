import { Stack, useLocalSearchParams } from 'expo-router';

import { AddFoodScreen, CreateMealScreen } from '@/features/meals';
import { parseNewMealRouteParams } from '@/features/meals/utils/mealRoutes';
import { useTodayDateKey } from '@/hooks/useTodayDateKey';

export default function NewMealRoute() {
  const params = useLocalSearchParams<{ duplicateOf?: string; date?: string; mealType?: string }>();
  const todayKey = useTodayDateKey();
  const route = parseNewMealRouteParams(params, todayKey);

  if (route.duplicateOfId) {
    return (
      <>
        <Stack.Screen options={{ title: 'Duplicate Meal' }} />
        <CreateMealScreen duplicateOfId={route.duplicateOfId} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Add Food' }} />
      <AddFoodScreen presetDate={route.date} presetMealType={route.mealType} />
    </>
  );
}
