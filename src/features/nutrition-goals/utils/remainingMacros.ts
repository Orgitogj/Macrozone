import type {
  DailyNutritionGoals,
  MacroGoalBreakdown,
  MacroGoalProgress,
} from '@/features/nutrition-goals/types';
import { MACRO_KEYS, type MacroTotals } from '@/types/nutrition';
import { roundTo } from '@/utils/math';

const PRECISION = 2;

function toSafeAmount(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function calculateMacroGoalProgress(
  consumed: number,
  goal: number,
): MacroGoalProgress {
  const safeConsumed = toSafeAmount(consumed);
  const safeGoal = toSafeAmount(goal);
  const difference = roundTo(safeGoal - safeConsumed, PRECISION);
  return {
    consumed: safeConsumed,
    goal: safeGoal,
    remaining: Math.max(difference, 0),
    exceeded: Math.max(-difference, 0),
  };
}

export function calculateRemainingMacros(
  totals: MacroTotals,
  goals: DailyNutritionGoals,
): MacroGoalBreakdown {
  const breakdown = {} as MacroGoalBreakdown;
  for (const key of MACRO_KEYS) {
    breakdown[key] = calculateMacroGoalProgress(totals[key], goals[key]);
  }
  return breakdown;
}
