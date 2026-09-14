import type { DailyMealSummary, Meal } from '@/features/meals/types';
import { calculateMacroTotals } from '@/features/meals/utils/macroTotals';
import { filterMealsByDate } from '@/features/meals/utils/mealDates';
import type { DailyNutritionGoals, MacroGoalProgress } from '@/features/nutrition-goals/types';
import { calculateRemainingMacros } from '@/features/nutrition-goals/utils/remainingMacros';
import { formatLongDate, type LocalDateKey } from '@/utils/date';
import { formatCalories, formatGrams } from '@/utils/format';

export function buildDailySummary(
  meals: readonly Meal[],
  dateKey: LocalDateKey,
  goals: DailyNutritionGoals,
): DailyMealSummary {
  const mealsForDay = filterMealsByDate(meals, dateKey);
  const totals = calculateMacroTotals(mealsForDay);
  return {
    dateKey,
    meals: mealsForDay,
    totals,
    goals,
    goalProgress: calculateRemainingMacros(totals, goals),
  };
}

function describeGoalStatus(
  { remaining, exceeded }: MacroGoalProgress,
  format: (value: number) => string,
): string {
  return exceeded > 0
    ? `${format(exceeded)} over`
    : `${format(remaining)} remaining`;
}

function formatGramLine(label: string, progress: MacroGoalProgress): string {
  return `${label}: ${formatGrams(progress.consumed)} / ${formatGrams(progress.goal)} (${describeGoalStatus(progress, formatGrams)})`;
}

export function formatDailySummaryText(summary: DailyMealSummary): string {
  const { calories, protein, carbs, fat } = summary.goalProgress;
  return [
    'MacroZone Daily Summary',
    formatLongDate(summary.dateKey),
    '',
    `Calories: ${formatCalories(calories.consumed)} / ${formatCalories(calories.goal)} kcal (${describeGoalStatus(calories, formatCalories)})`,
    formatGramLine('Protein', protein),
    formatGramLine('Carbs', carbs),
    formatGramLine('Fat', fat),
    '',
    `Meals logged: ${summary.meals.length}`,
  ].join('\n');
}
