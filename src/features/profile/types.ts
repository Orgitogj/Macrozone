import type {
  ACTIVITY_LEVELS,
  FORMULA_SEXES,
  UNIT_SYSTEMS,
  WEIGHT_GOALS,
} from '@/features/profile/constants';

export type UnitSystem = (typeof UNIT_SYSTEMS)[number];
export type FormulaSex = (typeof FORMULA_SEXES)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];
export type WeightGoal = (typeof WEIGHT_GOALS)[number];

export type BodyProfileInput = {
  unitSystem: UnitSystem;
  sex: FormulaSex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  weightGoal: WeightGoal;
  weeklyRateKg: number;
};

export type BodyProfile = BodyProfileInput & {
  updatedAt: string;
};
