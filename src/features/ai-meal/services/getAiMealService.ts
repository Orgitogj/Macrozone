import { createAiMealApiClient } from '@/features/ai-meal/adapters/aiMealApiClient';
import { createPhotoAdapter, type PhotoAdapter } from '@/features/ai-meal/adapters/photoAdapter';
import { getAiEndpointConfig } from '@/features/ai-meal/config/aiEndpoint';
import { createAsyncStorageAiPreferencesRepository } from '@/features/ai-meal/repositories/aiPreferencesRepository';
import { createAiMealService, type AiMealService } from '@/features/ai-meal/services/aiMealService';
import { getLibraryService } from '@/features/library/services/libraryActions';
import { getDiaryLogRepository } from '@/features/meals/repositories/getDiaryLogRepository';

let service: AiMealService | null = null;
let photos: PhotoAdapter | null = null;

export function getAiMealService(): AiMealService {
  if (service === null) {
    const preferences = createAsyncStorageAiPreferencesRepository();
    const endpoint = getAiEndpointConfig();
    service = createAiMealService({
      apiClient:
        endpoint.status === 'configured'
          ? createAiMealApiClient({
              analyzeUrl: endpoint.analyzeUrl,
              getRateLimitKey: () => preferences.getRateLimitKey(),
              fetchImpl: (url, init) => fetch(url, init),
            })
          : null,
      preferences,
      searchFoods: (query) => getLibraryService().listFoods(query),
      diary: getDiaryLogRepository(),
    });
  }
  return service;
}

export function getPhotoAdapter(): PhotoAdapter {
  photos ??= createPhotoAdapter();
  return photos;
}
