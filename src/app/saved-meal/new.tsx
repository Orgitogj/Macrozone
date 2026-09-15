import { SavedMealFormScreen, useLibraryRouteParams } from '@/features/library';

export default function NewSavedMealRoute() {
  const { destination } = useLibraryRouteParams();
  return <SavedMealFormScreen mode='create' savedMealId={null} destination={destination} />;
}
