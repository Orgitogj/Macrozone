import { GOAL_TARGET_LIMITS } from '@/features/nutrition-goals/constants';
import type { DailyNutritionGoals } from '@/features/nutrition-goals/types';
import { calculateMacroCalories } from '@/features/nutrition-goals/utils/goalCalculator';
import type { MacroKey } from '@/types/nutrition';
import { formatCalories } from '@/utils/format';
import { formatNumberForInput, parseDecimalInput } from '@/utils/numberInput';

export type GoalTargetsFormValues = Record<MacroKey, string>;

export type GoalTargetsErrors = Partial<Record<MacroKey, string>>;

export type GoalTargetsValidationResult =
  | { ok: true; goals: DailyNutritionGoals; warnings: string[] }
  | { ok: false; errors: GoalTargetsErrors };

const LABELS: Record<MacroKey, string> = {
  calories: 'Calories',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
};

export function goalsToFormValues(goals: DailyNutritionGoals): GoalTargetsFormValues {
  return {
    calories: formatNumberForInput(goals.calories),
    protein: formatNumberForInput(goals.protein),
    carbs: formatNumberForInput(goals.carbs),
    fat: formatNumberForInput(goals.fat),
  };
}

function validateTarget(key: MacroKey, text: string): { value: number } | { error: string } {
  const limits = GOAL_TARGET_LIMITS;
  const isCalories = key === 'calories';
  const min = isCalories ? limits.minCalories : 0;
  const max = isCalories ? limits.maxCalories : limits.maxMacroGrams;
  const unit = isCalories ? ' kcal' : 'g';
  const result = parseDecimalInput(text, limits.maxDecimalPlaces);

  switch (result.kind) {
    case 'empty':
      return { error: `${LABELS[key]} is required.` };
    case 'negative':
      return { error: `${LABELS[key]} can't be negative.` };
    case 'tooManyDecimals':
      return { error: `Use at most ${limits.maxDecimalPlaces} decimal place, without thousands separators.` };
    case 'invalid':
      return { error: 'Enter a number, for example 150.' };
    case 'number':
      if (result.value < min || result.value > max) {
        return {
          error: `${LABELS[key]} must be between ${formatCalories(min)}${unit} and ${formatCalories(max)}${unit}.`,
        };
      }
      return { value: result.value };
  }
}

export function getGoalTargetWarnings(goals: DailyNutritionGoals): string[] {
  const warnings: string[] = [];
  if (goals.calories < GOAL_TARGET_LIMITS.lowCalorieWarning) {
    warnings.push(
      `Targets below ${formatCalories(GOAL_TARGET_LIMITS.lowCalorieWarning)} kcal are very low for most adults. Consider guidance from a health professional.`,
    );
  }
  const macroCalories = calculateMacroCalories(goals);
  if (goals.calories > 0) {
    const difference = Math.abs(macroCalories - goals.calories) / goals.calories;
    if (difference > GOAL_TARGET_LIMITS.macroMismatchWarningShare) {
      warnings.push(
        `Your macros add up to ${formatCalories(macroCalories)} kcal, which differs from your ${formatCalories(goals.calories)} kcal calorie target.`,
      );
    }
  }
  return warnings;
}

export function validateGoalTargetsForm(values: GoalTargetsFormValues): GoalTargetsValidationResult {
  const errors: GoalTargetsErrors = {};
  const goals = {} as DailyNutritionGoals;
  for (const key of ['calories', 'protein', 'carbs', 'fat'] as const) {
    const result = validateTarget(key, values[key]);
    if ('error' in result) {
      errors[key] = result.error;
    } else {
      goals[key] = result.value;
    }
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, goals, warnings: getGoalTargetWarnings(goals) };
}
