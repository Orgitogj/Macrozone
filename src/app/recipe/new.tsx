import { RecipeFormScreen, useLibraryRouteParams } from '@/features/library';

export default function NewRecipeRoute() {
  const { destination } = useLibraryRouteParams();
  return <RecipeFormScreen mode='create' recipeId={null} destination={destination} />;
}
