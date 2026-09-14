import type { BodyProfile } from '@/features/profile/types';
import type { MacroKey, MacroTotals } from '@/types/nutrition';

export type DailyNutritionGoals = MacroTotals;

export type MacroGoalProgress = {
  consumed: number;
  goal: number;
  remaining: number;
  exceeded: number;
};

export type MacroGoalBreakdown = Record<MacroKey, MacroGoalProgress>;

export type GoalSource = 'calculated' | 'manual';

export type SavedNutritionGoals = DailyNutritionGoals & {
  source: GoalSource;
  updatedAt: string;
};

export type OnboardingStatus = 'completed' | 'skipped';

export type NutritionPlan = {
  profile: BodyProfile | null;
  goals: SavedNutritionGoals | null;
  onboardingStatus: OnboardingStatus | null;
};
