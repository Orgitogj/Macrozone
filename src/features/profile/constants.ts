import type { ActivityLevel, FormulaSex, UnitSystem, WeightGoal } from '@/features/profile/types';

export const UNIT_SYSTEMS = ['metric', 'imperial'] as const;
export const FORMULA_SEXES = ['female', 'male', 'unspecified'] as const;
export const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const;
export const WEIGHT_GOALS = ['lose', 'maintain', 'gain'] as const;

export const UNIT_SYSTEM_LABELS: Readonly<Record<UnitSystem, string>> = {
  metric: 'Metric (kg, cm)',
  imperial: 'Imperial (lb, ft)',
};

export const FORMULA_SEX_LABELS: Readonly<Record<FormulaSex, string>> = {
  female: 'Female',
  male: 'Male',
  unspecified: 'Not specified',
};

export const ACTIVITY_LEVEL_DETAILS: Readonly<
  Record<ActivityLevel, { label: string; description: string }>
> = {
  sedentary: { label: 'Sedentary', description: 'Little or no exercise, mostly sitting' },
  light: { label: 'Lightly active', description: 'Light exercise 1–3 days a week' },
  moderate: { label: 'Moderately active', description: 'Moderate exercise 3–5 days a week' },
  active: { label: 'Very active', description: 'Hard exercise 6–7 days a week' },
  very_active: { label: 'Extra active', description: 'Hard daily training or a physical job' },
};

export const WEIGHT_GOAL_DETAILS: Readonly<Record<WeightGoal, { label: string; description: string }>> = {
  lose: { label: 'Lose weight', description: 'Eat below your estimated maintenance calories' },
  maintain: { label: 'Maintain weight', description: 'Eat around your estimated maintenance calories' },
  gain: { label: 'Gain weight', description: 'Eat above your estimated maintenance calories' },
};

export const WEEKLY_RATE_OPTIONS: Readonly<
  Record<UnitSystem, Readonly<Record<Exclude<WeightGoal, 'maintain'>, readonly number[]>>>
> = {
  metric: { lose: [0.25, 0.5, 0.75, 1], gain: [0.25, 0.5] },
  imperial: { lose: [0.5, 1, 1.5, 2], gain: [0.5, 1] },
};

export const BODY_PROFILE_LIMITS = {
  minAgeYears: 18,
  maxAgeYears: 100,
  minHeightCm: 120,
  maxHeightCm: 230,
  minWeightKg: 35,
  maxWeightKg: 300,
  maxDecimalPlaces: 1,
} as const;
