import type { DailyNutritionGoals, GoalSource } from '@/features/nutrition-goals/types';
import type { ActivityLevel, FormulaSex, WeightGoal } from '@/features/profile/types';

export const DEFAULT_DAILY_GOALS: Readonly<DailyNutritionGoals> = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
};

export const MIFFLIN_ST_JEOR = {
  weightFactor: 10,
  heightFactor: 6.25,
  ageFactor: 5,
  sexConstants: { male: 5, female: -161, unspecified: -78 } as Readonly<Record<FormulaSex, number>>,
} as const;

export const ACTIVITY_FACTORS: Readonly<Record<ActivityLevel, number>> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const KCAL_PER_KG_BODY_WEIGHT = 7700;
export const DAYS_PER_WEEK = 7;
export const CALORIE_TARGET_ROUNDING = 10;

export const MINIMUM_CALORIE_TARGETS: Readonly<Record<FormulaSex, number>> = {
  female: 1200,
  male: 1500,
  unspecified: 1350,
};

export const PROTEIN_GRAMS_PER_KG: Readonly<Record<WeightGoal, number>> = {
  lose: 2.0,
  maintain: 1.6,
  gain: 1.8,
};

export const MACRO_RULES = {
  proteinMaxCalorieShare: 0.35,
  fatCalorieShare: 0.25,
  fatMinGramsPerKg: 0.5,
  fatMaxCalorieShare: 0.35,
} as const;

export const KCAL_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
} as const;

export const GOAL_TARGET_LIMITS = {
  minCalories: 500,
  maxCalories: 10000,
  lowCalorieWarning: 1200,
  maxMacroGrams: 1000,
  maxDecimalPlaces: 1,
  macroMismatchWarningShare: 0.1,
} as const;

export const GOAL_SOURCE_LABELS: Readonly<Record<GoalSource | 'default', string>> = {
  calculated: 'Calculated from your details',
  manual: 'Entered manually',
  default: 'Default goals',
};

export const ESTIMATE_DISCLAIMER =
  'These targets are estimates based on general formulas, not medical advice. Talk to a doctor or registered dietitian if you are pregnant, have a medical condition, or need specific guidance.';
