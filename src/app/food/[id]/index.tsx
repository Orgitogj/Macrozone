import { FoodDetailScreen, useLibraryRouteParams } from '@/features/library';

export default function FoodRoute() {
  const { id, destination, amount } = useLibraryRouteParams();
  return <FoodDetailScreen key={id ?? 'missing'} foodId={id} initialDestination={destination} initialAmount={amount} />;
}
