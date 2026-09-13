import type { MacroKey, MacroTotals } from '@/types/nutrition';

export type DailyNutritionGoals = MacroTotals;

export type MacroGoalProgress = {
  consumed: number;
  goal: number;
  remaining: number;
  exceeded: number;
};

export type MacroGoalBreakdown = Record<MacroKey, MacroGoalProgress>;
