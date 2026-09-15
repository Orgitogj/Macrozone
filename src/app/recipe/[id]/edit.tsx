import { RecipeFormScreen, useLibraryRouteParams } from '@/features/library';

export default function EditRecipeRoute() {
  const { id, destination } = useLibraryRouteParams();
  return <RecipeFormScreen mode='edit' recipeId={id} destination={destination} />;
}
