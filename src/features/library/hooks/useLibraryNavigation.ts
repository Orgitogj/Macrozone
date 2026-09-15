import { useRouter } from 'expo-router';

import { buildDestinationParams } from '@/features/library/utils/libraryRoutes';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';

export function useLibraryNavigation() {
  const router = useRouter();

  return {
    openFood: (id: string, destination: LogDestination, amount: number | null = null) =>
      router.push({
        pathname: '/food/[id]',
        params: { id, ...buildDestinationParams(destination), ...(amount === null ? {} : { amount: String(amount) }) },
      }),
    replaceWithFood: (id: string, destination: LogDestination) =>
      router.replace({ pathname: '/food/[id]', params: { id, ...buildDestinationParams(destination) } }),
    createFood: (destination: LogDestination) =>
      router.push({ pathname: '/food/new', params: buildDestinationParams(destination) }),
    editFood: (id: string, destination: LogDestination) =>
      router.push({ pathname: '/food/[id]/edit', params: { id, ...buildDestinationParams(destination) } }),

    openSavedMeal: (id: string, destination: LogDestination) =>
      router.push({ pathname: '/saved-meal/[id]', params: { id, ...buildDestinationParams(destination) } }),
    replaceWithSavedMeal: (id: string, destination: LogDestination) =>
      router.replace({ pathname: '/saved-meal/[id]', params: { id, ...buildDestinationParams(destination) } }),
    createSavedMeal: (destination: LogDestination) =>
      router.push({ pathname: '/saved-meal/new', params: buildDestinationParams(destination) }),
    editSavedMeal: (id: string, destination: LogDestination) =>
      router.push({ pathname: '/saved-meal/[id]/edit', params: { id, ...buildDestinationParams(destination) } }),

    openRecipe: (id: string, destination: LogDestination) =>
      router.push({ pathname: '/recipe/[id]', params: { id, ...buildDestinationParams(destination) } }),
    replaceWithRecipe: (id: string, destination: LogDestination) =>
      router.replace({ pathname: '/recipe/[id]', params: { id, ...buildDestinationParams(destination) } }),
    createRecipe: (destination: LogDestination) =>
      router.push({ pathname: '/recipe/new', params: buildDestinationParams(destination) }),
    editRecipe: (id: string, destination: LogDestination) =>
      router.push({ pathname: '/recipe/[id]/edit', params: { id, ...buildDestinationParams(destination) } }),

    goBack: () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.navigate('/add');
      }
    },
  };
}
