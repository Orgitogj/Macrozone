import { FoodFormScreen, useLibraryRouteParams } from '@/features/library';

export default function EditFoodRoute() {
  const { id, destination } = useLibraryRouteParams();
  return <FoodFormScreen mode='edit' foodId={id} destination={destination} />;
}
