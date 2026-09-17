import type { AiMealApiClient } from '@/features/ai-meal/adapters/aiMealApiClient';
import { AI_CONTRACT_VERSION, AI_LIMITS, AI_PHOTO_DISCLOSURE_VERSION } from '@/features/ai-meal/constants';
import type { AiPreferencesRepository } from '@/features/ai-meal/repositories/aiPreferencesRepository';
import type { AiAnalysisInput, AiAnalysisOutcome, AiMealAnalysis } from '@/features/ai-meal/types';
import { buildMatchSearchTerm, matchLocalFood } from '@/features/ai-meal/utils/localFoodMatching';
import {
  createReviewDraft,
  linkItemToFood,
  validateReviewDraft,
  type AiReviewDraft,
} from '@/features/ai-meal/utils/reviewDraft';
import { isEncodedPhotoWithinLimit } from '@/features/ai-meal/validation/photo';
import { validateMealText } from '@/features/ai-meal/validation/textInput';
import type { Food, FoodListQuery } from '@/features/library/types';
import type { DiaryLogRepository } from '@/features/meals/repositories/diaryLogRepository';
import { getMealErrorMessage } from '@/features/meals/services/mealActions';
import type { Meal, NewDiaryEntry } from '@/features/meals/types';
import { validateDestination, type LogDestination } from '@/features/meals/utils/libraryEntries';
import type { LocalDateKey } from '@/utils/date';

export type AiSaveResult =
  | { status: 'saved'; meals: Meal[] }
  | { status: 'invalid'; titleError: string | null; listError: string | null; itemErrors: Record<string, string>; message: string | null }
  | { status: 'failed'; message: string };

export type AiMealServiceDependencies = {
  apiClient: AiMealApiClient | null;
  preferences: AiPreferencesRepository;
  searchFoods: (query: FoodListQuery) => Promise<Food[]>;
  diary: DiaryLogRepository;
};

export function createAiMealService({ apiClient, preferences, searchFoods, diary }: AiMealServiceDependencies) {
  return {
    isConfigured: () => apiClient !== null,

    needsPhotoDisclosure: async (): Promise<boolean> => {
      try {
        return (await preferences.getAcknowledgedPhotoDisclosureVersion()) !== AI_PHOTO_DISCLOSURE_VERSION;
      } catch {
        return true;
      }
    },

    acknowledgePhotoDisclosure: () => preferences.acknowledgePhotoDisclosure(AI_PHOTO_DISCLOSURE_VERSION),

    analyze: async (input: AiAnalysisInput, signal: AbortSignal): Promise<AiAnalysisOutcome> => {
      if (apiClient === null) {
        return { status: 'error', code: 'NOT_CONFIGURED', serverMessage: null, retryAfterSeconds: null };
      }
      if (input.kind === 'text') {
        const text = validateMealText(input.text);
        if (!text.ok) {
          return { status: 'error', code: 'INVALID_INPUT', serverMessage: text.error, retryAfterSeconds: null };
        }
        return apiClient.analyze({ version: AI_CONTRACT_VERSION, inputKind: 'text', text: text.text }, { signal });
      }
      if (input.note !== null && input.note.length > AI_LIMITS.maxPhotoNoteLength) {
        return { status: 'error', code: 'INVALID_INPUT', serverMessage: 'Keep the note short.', retryAfterSeconds: null };
      }
      if (!isEncodedPhotoWithinLimit(input.photo.base64)) {
        return { status: 'error', code: 'INVALID_IMAGE', serverMessage: 'This photo is too large to analyze.', retryAfterSeconds: null };
      }
      let acknowledged: number | null = null;
      try {
        acknowledged = await preferences.getAcknowledgedPhotoDisclosureVersion();
      } catch {
        acknowledged = null;
      }
      if (acknowledged !== AI_PHOTO_DISCLOSURE_VERSION) {
        return {
          status: 'error',
          code: 'INVALID_IMAGE',
          serverMessage: 'Confirm that the photo may be sent for analysis first.',
          retryAfterSeconds: null,
        };
      }
      return apiClient.analyze(
        {
          version: AI_CONTRACT_VERSION,
          inputKind: 'photo',
          image: { mediaType: input.photo.mediaType, base64: input.photo.base64 },
          note: input.note,
        },
        { signal },
      );
    },

    buildReviewDraft: async (analysis: AiMealAnalysis): Promise<AiReviewDraft> => {
      const draft = createReviewDraft(analysis);
      const items = await Promise.all(
        draft.items.map(async (item) => {
          const term = buildMatchSearchTerm(item.name);
          if (term.length < 2) {
            return item;
          }
          let candidates: Food[];
          try {
            candidates = await searchFoods({ search: term, limit: 50 });
          } catch {
            return item;
          }
          const { match, suggestions } = matchLocalFood(item.name, item.unit, candidates);
          if (match) {
            return linkItemToFood(item, match);
          }
          return { ...item, suggestions };
        }),
      );
      return { ...draft, items };
    },

    save: async ({
      draft,
      destination,
      todayKey,
    }: {
      draft: AiReviewDraft;
      destination: LogDestination;
      todayKey: LocalDateKey;
    }): Promise<AiSaveResult> => {
      const destinationError = validateDestination(destination, todayKey);
      if (destinationError) {
        return { status: 'invalid', titleError: null, listError: null, itemErrors: {}, message: destinationError };
      }
      const validation = validateReviewDraft(draft);
      if (!validation.ok) {
        return {
          status: 'invalid',
          titleError: validation.titleError,
          listError: validation.listError,
          itemErrors: validation.itemErrors,
          message: 'Fix the highlighted fields before adding this meal.',
        };
      }
      const entries: NewDiaryEntry[] = validation.items.map((item) => ({
        input: { name: item.name, ...item.nutrition, mealType: destination.mealType, date: destination.date, time: null },
        source: {
          sourceType: 'ai',
          inputKind: draft.inputKind,
          mealTitle: validation.title,
          itemName: item.name,
          amount: item.amount,
          unit: item.unit,
          matchedFoodId: item.matchedFoodId,
        },
      }));
      try {
        return { status: 'saved', meals: await diary.logEntries(entries, { group: true }) };
      } catch (error) {
        return { status: 'failed', message: getMealErrorMessage(error, 'Could not add this meal. Nothing was added.') };
      }
    },
  };
}

export type AiMealService = ReturnType<typeof createAiMealService>;
