import type {
  DailyNutritionGoals,
  GoalSource,
  NutritionPlan,
  OnboardingStatus,
  SavedNutritionGoals,
} from '@/features/nutrition-goals/types';
import type { BodyProfile, BodyProfileInput } from '@/features/profile/types';
import {
  isActivityLevel,
  isFormulaSex,
  isUnitSystem,
  isWeightGoal,
} from '@/features/profile/utils/units';
import { MACRO_KEYS } from '@/types/nutrition';

export type NutritionPlanRepositoryErrorCode = 'read_failed' | 'write_failed';

export class NutritionPlanRepositoryError extends Error {
  readonly code: NutritionPlanRepositoryErrorCode;

  constructor(code: NutritionPlanRepositoryErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'NutritionPlanRepositoryError';
    this.code = code;
  }
}

export const NUTRITION_PLAN_MESSAGES = {
  readFailed: 'Could not load your nutrition goals.',
  writeFailed: 'Could not save your nutrition goals. Please try again.',
} as const;

export type SaveGoalsRequest = {
  goals: DailyNutritionGoals;
  source: GoalSource;
  profile?: BodyProfileInput;
};

export type NutritionPlanRepository = {
  getPlan(): Promise<NutritionPlan>;
  saveGoals(request: SaveGoalsRequest): Promise<NutritionPlan>;
  skipOnboarding(): Promise<NutritionPlan>;
};

export const EMPTY_NUTRITION_PLAN: NutritionPlan = {
  profile: null,
  goals: null,
  onboardingStatus: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isPositiveNumber(value: unknown): value is number {
  return isNonNegativeNumber(value) && value > 0;
}

export function isOnboardingStatus(value: unknown): value is OnboardingStatus {
  return value === 'completed' || value === 'skipped';
}

export function parseBodyProfile(value: unknown): BodyProfile | null {
  if (!isRecord(value)) {
    return null;
  }
  const { unitSystem, sex, ageYears, heightCm, weightKg, activityLevel, weightGoal, weeklyRateKg, updatedAt } = value;
  if (
    !isUnitSystem(unitSystem) ||
    !isFormulaSex(sex) ||
    !isPositiveNumber(ageYears) ||
    !Number.isInteger(ageYears) ||
    !isPositiveNumber(heightCm) ||
    !isPositiveNumber(weightKg) ||
    !isActivityLevel(activityLevel) ||
    !isWeightGoal(weightGoal) ||
    !isNonNegativeNumber(weeklyRateKg) ||
    typeof updatedAt !== 'string'
  ) {
    return null;
  }
  return { unitSystem, sex, ageYears, heightCm, weightKg, activityLevel, weightGoal, weeklyRateKg, updatedAt };
}

export function parseSavedGoals(value: unknown): SavedNutritionGoals | null {
  if (!isRecord(value)) {
    return null;
  }
  const { source, updatedAt } = value;
  if ((source !== 'calculated' && source !== 'manual') || typeof updatedAt !== 'string') {
    return null;
  }
  const goals = {} as DailyNutritionGoals;
  for (const key of MACRO_KEYS) {
    const amount = value[key];
    if (!isNonNegativeNumber(amount)) {
      return null;
    }
    goals[key] = amount;
  }
  return { ...goals, source, updatedAt };
}
