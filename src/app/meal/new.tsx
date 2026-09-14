import { Stack, useLocalSearchParams } from 'expo-router';

import { CreateMealScreen } from '@/features/meals';
import { getSingleParam } from '@/utils/routeParams';

export default function NewMealRoute() {
  const { duplicateOf } = useLocalSearchParams<{ duplicateOf?: string }>();
  const duplicateOfId = getSingleParam(duplicateOf);

  return (
    <>
      <Stack.Screen options={{ title: duplicateOfId ? 'Duplicate Meal' : 'Add Meal' }} />
      <CreateMealScreen duplicateOfId={duplicateOfId} />
    </>
  );
}
