import { FoodFormScreen, useLibraryRouteParams } from '@/features/library';

export default function NewFoodRoute() {
  const { destination } = useLibraryRouteParams();
  return <FoodFormScreen mode='create' foodId={null} destination={destination} />;
}
