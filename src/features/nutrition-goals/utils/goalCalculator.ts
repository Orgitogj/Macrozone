import {
  ACTIVITY_FACTORS,
  CALORIE_TARGET_ROUNDING,
  DAYS_PER_WEEK,
  KCAL_PER_GRAM,
  KCAL_PER_KG_BODY_WEIGHT,
  MACRO_RULES,
  MIFFLIN_ST_JEOR,
  MINIMUM_CALORIE_TARGETS,
  PROTEIN_GRAMS_PER_KG,
} from '@/features/nutrition-goals/constants';
import type { DailyNutritionGoals } from '@/features/nutrition-goals/types';
import type { ActivityLevel, BodyProfileInput, FormulaSex, WeightGoal } from '@/features/profile/types';

export type NutritionTargetCalculation = {
  bmr: number;
  activityFactor: number;
  tdee: number;
  dailyAdjustment: number;
  unadjustedCalorieTarget: number;
  minimumCalories: number;
  minimumApplied: boolean;
  proteinGramsPerKg: number;
  goals: DailyNutritionGoals;
};

export function calculateBmr({
  sex,
  weightKg,
  heightCm,
  ageYears,
}: Pick<BodyProfileInput, 'sex' | 'weightKg' | 'heightCm' | 'ageYears'>): number {
  return (
    MIFFLIN_ST_JEOR.weightFactor * weightKg +
    MIFFLIN_ST_JEOR.heightFactor * heightCm -
    MIFFLIN_ST_JEOR.ageFactor * ageYears +
    MIFFLIN_ST_JEOR.sexConstants[sex]
  );
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_FACTORS[activityLevel];
}

export function calculateDailyCalorieAdjustment(weightGoal: WeightGoal, weeklyRateKg: number): number {
  if (weightGoal === 'maintain') {
    return 0;
  }
  const magnitude = (Math.abs(weeklyRateKg) * KCAL_PER_KG_BODY_WEIGHT) / DAYS_PER_WEEK;
  return weightGoal === 'lose' ? -magnitude : magnitude;
}

export function roundCalorieTarget(calories: number): number {
  return Math.round(calories / CALORIE_TARGET_ROUNDING) * CALORIE_TARGET_ROUNDING;
}

export function calculateCalorieTarget({
  tdee,
  weightGoal,
  weeklyRateKg,
  sex,
}: {
  tdee: number;
  weightGoal: WeightGoal;
  weeklyRateKg: number;
  sex: FormulaSex;
}): { calories: number; unadjusted: number; dailyAdjustment: number; minimumCalories: number; minimumApplied: boolean } {
  const dailyAdjustment = calculateDailyCalorieAdjustment(weightGoal, weeklyRateKg);
  const unadjusted = roundCalorieTarget(tdee + dailyAdjustment);
  const minimumCalories = MINIMUM_CALORIE_TARGETS[sex];
  const minimumApplied = unadjusted < minimumCalories;
  return {
    calories: minimumApplied ? minimumCalories : unadjusted,
    unadjusted,
    dailyAdjustment,
    minimumCalories,
    minimumApplied,
  };
}

export function calculateMacroTargets({
  calories,
  weightKg,
  weightGoal,
}: {
  calories: number;
  weightKg: number;
  weightGoal: WeightGoal;
}): Omit<DailyNutritionGoals, 'calories'> {
  if (calories <= 0) {
    return { protein: 0, carbs: 0, fat: 0 };
  }
  const proteinByWeight = PROTEIN_GRAMS_PER_KG[weightGoal] * weightKg;
  const proteinCap = (calories * MACRO_RULES.proteinMaxCalorieShare) / KCAL_PER_GRAM.protein;
  const protein = Math.round(Math.min(proteinByWeight, proteinCap));

  const fatBase = (calories * MACRO_RULES.fatCalorieShare) / KCAL_PER_GRAM.fat;
  const fatMinimum = MACRO_RULES.fatMinGramsPerKg * weightKg;
  const fatMaximum = (calories * MACRO_RULES.fatMaxCalorieShare) / KCAL_PER_GRAM.fat;
  const fat = Math.round(Math.min(Math.max(fatBase, fatMinimum), fatMaximum));

  const remainingCalories = calories - protein * KCAL_PER_GRAM.protein - fat * KCAL_PER_GRAM.fat;
  const carbs = Math.max(0, Math.round(remainingCalories / KCAL_PER_GRAM.carbs));

  return { protein, carbs, fat };
}

export function calculateNutritionTargets(profile: BodyProfileInput): NutritionTargetCalculation {
  const bmr = calculateBmr(profile);
  const activityFactor = ACTIVITY_FACTORS[profile.activityLevel];
  const tdee = calculateTdee(bmr, profile.activityLevel);
  const target = calculateCalorieTarget({
    tdee,
    weightGoal: profile.weightGoal,
    weeklyRateKg: profile.weeklyRateKg,
    sex: profile.sex,
  });
  const macros = calculateMacroTargets({
    calories: target.calories,
    weightKg: profile.weightKg,
    weightGoal: profile.weightGoal,
  });

  return {
    bmr: Math.round(bmr),
    activityFactor,
    tdee: Math.round(tdee),
    dailyAdjustment: Math.round(target.dailyAdjustment),
    unadjustedCalorieTarget: target.unadjusted,
    minimumCalories: target.minimumCalories,
    minimumApplied: target.minimumApplied,
    proteinGramsPerKg: PROTEIN_GRAMS_PER_KG[profile.weightGoal],
    goals: { calories: target.calories, ...macros },
  };
}

export function calculateMacroCalories({ protein, carbs, fat }: Omit<DailyNutritionGoals, 'calories'>): number {
  return protein * KCAL_PER_GRAM.protein + carbs * KCAL_PER_GRAM.carbs + fat * KCAL_PER_GRAM.fat;
}
