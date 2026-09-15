import { SavedMealFormScreen, useLibraryRouteParams } from '@/features/library';

export default function EditSavedMealRoute() {
  const { id, destination } = useLibraryRouteParams();
  return <SavedMealFormScreen mode='edit' savedMealId={id} destination={destination} />;
}
