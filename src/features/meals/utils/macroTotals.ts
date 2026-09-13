import { MACRO_KEYS, type MacroTotals } from '@/types/nutrition';
import { roundTo } from '@/utils/math';

const PRECISION = 2;

export function createEmptyMacroTotals(): MacroTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

export function calculateMacroTotals(items: readonly MacroTotals[]): MacroTotals {
  const totals = createEmptyMacroTotals();
  for (const item of items) {
    for (const key of MACRO_KEYS) {
      totals[key] += item[key];
    }
  }
  for (const key of MACRO_KEYS) {
    totals[key] = roundTo(totals[key], PRECISION);
  }
  return totals;
}
