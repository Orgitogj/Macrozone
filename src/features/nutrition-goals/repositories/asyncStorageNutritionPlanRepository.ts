import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  EMPTY_NUTRITION_PLAN,
  isOnboardingStatus,
  NUTRITION_PLAN_MESSAGES,
  NutritionPlanRepositoryError,
  parseBodyProfile,
  parseSavedGoals,
  type NutritionPlanRepository,
  type SaveGoalsRequest,
} from '@/features/nutrition-goals/repositories/nutritionPlanRepository';
import type { NutritionPlan } from '@/features/nutrition-goals/types';
import { createSerialQueue, type SerialQueue } from '@/utils/serialQueue';

export const NUTRITION_PLAN_STORAGE_KEY = 'nutrition_plan';

type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

function parsePlan(json: string): NutritionPlan {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Stored nutrition plan has an unexpected format.');
  }
  const record = parsed as Record<string, unknown>;
  return {
    profile: parseBodyProfile(record.profile),
    goals: parseSavedGoals(record.goals),
    onboardingStatus: isOnboardingStatus(record.onboardingStatus) ? record.onboardingStatus : null,
  };
}

export function createAsyncStorageNutritionPlanRepository({
  storage = AsyncStorage,
  queue = createSerialQueue(),
  now = () => new Date(),
}: { storage?: KeyValueStorage; queue?: SerialQueue; now?: () => Date } = {}): NutritionPlanRepository {
  const readPlan = async (): Promise<NutritionPlan> => {
    try {
      const json = await storage.getItem(NUTRITION_PLAN_STORAGE_KEY);
      return json === null ? { ...EMPTY_NUTRITION_PLAN } : parsePlan(json);
    } catch (error) {
      throw new NutritionPlanRepositoryError('read_failed', NUTRITION_PLAN_MESSAGES.readFailed, { cause: error });
    }
  };

  const write = (update: (plan: NutritionPlan, timestamp: string) => NutritionPlan): Promise<NutritionPlan> =>
    queue.run(async () => {
      const current = await readPlan();
      const next = update(current, now().toISOString());
      try {
        await storage.setItem(NUTRITION_PLAN_STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        throw new NutritionPlanRepositoryError('write_failed', NUTRITION_PLAN_MESSAGES.writeFailed, { cause: error });
      }
      return next;
    });

  return {
    getPlan: readPlan,

    saveGoals: ({ goals, source, profile }: SaveGoalsRequest) =>
      write((plan, timestamp) => ({
        profile: profile ? { ...profile, updatedAt: timestamp } : plan.profile,
        goals: {
          calories: goals.calories,
          protein: goals.protein,
          carbs: goals.carbs,
          fat: goals.fat,
          source,
          updatedAt: timestamp,
        },
        onboardingStatus: 'completed',
      })),

    skipOnboarding: () =>
      write((plan) => ({
        ...plan,
        onboardingStatus: plan.onboardingStatus ?? 'skipped',
      })),
  };
}
