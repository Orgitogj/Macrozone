import { Stack, useLocalSearchParams } from 'expo-router';

import { EditMealScreen } from '@/features/meals';
import { getSingleParam } from '@/utils/routeParams';

export default function EditMealRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Meal' }} />
      <EditMealScreen mealId={getSingleParam(id)} />
    </>
  );
}
