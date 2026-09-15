import { SavedMealDetailScreen, useLibraryRouteParams } from '@/features/library';

export default function SavedMealRoute() {
  const { id, destination } = useLibraryRouteParams();
  return <SavedMealDetailScreen key={id ?? 'missing'} savedMealId={id} initialDestination={destination} />;
}
