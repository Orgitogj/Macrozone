import { RecipeDetailScreen, useLibraryRouteParams } from '@/features/library';

export default function RecipeRoute() {
  const { id, destination } = useLibraryRouteParams();
  return <RecipeDetailScreen key={id ?? 'missing'} recipeId={id} initialDestination={destination} />;
}
