import { Stack, useLocalSearchParams } from 'expo-router';

import { CreateMealScreen } from '@/features/meals';
import { parseNewMealRouteParams } from '@/features/meals/utils/mealRoutes';
import { useTodayDateKey } from '@/hooks/useTodayDateKey';

export default function NewMealRoute() {
  const params = useLocalSearchParams<{ duplicateOf?: string; date?: string; mealType?: string }>();
  const todayKey = useTodayDateKey();
  const route = parseNewMealRouteParams(params, todayKey);

  return (
    <>
      <Stack.Screen options={{ title: route.duplicateOfId ? 'Duplicate Meal' : 'Add Meal' }} />
      <CreateMealScreen
        duplicateOfId={route.duplicateOfId}
        presetDate={route.date}
        presetMealType={route.mealType}
      />
    </>
  );
}
