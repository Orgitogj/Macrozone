import { ACTIVITY_LEVELS, FORMULA_SEXES, UNIT_SYSTEMS, WEEKLY_RATE_OPTIONS, WEIGHT_GOALS } from '@/features/profile/constants';
import type { ActivityLevel, FormulaSex, UnitSystem, WeightGoal } from '@/features/profile/types';
import { roundTo } from '@/utils/math';

export const CM_PER_INCH = 2.54;
export const INCHES_PER_FOOT = 12;
export const KG_PER_POUND = 0.45359237;

const RATE_TOLERANCE_KG = 1e-6;

export function isUnitSystem(value: unknown): value is UnitSystem {
  return typeof value === 'string' && (UNIT_SYSTEMS as readonly string[]).includes(value);
}

export function isFormulaSex(value: unknown): value is FormulaSex {
  return typeof value === 'string' && (FORMULA_SEXES as readonly string[]).includes(value);
}

export function isActivityLevel(value: unknown): value is ActivityLevel {
  return typeof value === 'string' && (ACTIVITY_LEVELS as readonly string[]).includes(value);
}

export function isWeightGoal(value: unknown): value is WeightGoal {
  return typeof value === 'string' && (WEIGHT_GOALS as readonly string[]).includes(value);
}

export function poundsToKg(pounds: number): number {
  return pounds * KG_PER_POUND;
}

export function kgToPounds(kilograms: number): number {
  return kilograms / KG_PER_POUND;
}

export function feetAndInchesToCm(feet: number, inches: number): number {
  return (feet * INCHES_PER_FOOT + inches) * CM_PER_INCH;
}

export function cmToFeetAndInches(centimeters: number): { feet: number; inches: number } {
  const totalInches = roundTo(centimeters / CM_PER_INCH, 1);
  let feet = Math.floor(totalInches / INCHES_PER_FOOT);
  let inches = roundTo(totalInches - feet * INCHES_PER_FOOT, 1);
  if (inches >= INCHES_PER_FOOT) {
    feet += 1;
    inches = roundTo(inches - INCHES_PER_FOOT, 1);
  }
  return { feet, inches };
}

function trimNumber(value: number, fractionDigits: number): string {
  return String(roundTo(value, fractionDigits));
}

export function formatHeight(centimeters: number, unitSystem: UnitSystem): string {
  if (unitSystem === 'metric') {
    return `${trimNumber(centimeters, 1)} cm`;
  }
  const { feet, inches } = cmToFeetAndInches(centimeters);
  return `${feet} ft ${trimNumber(inches, 1)} in`;
}

export function formatWeight(kilograms: number, unitSystem: UnitSystem): string {
  return unitSystem === 'metric'
    ? `${trimNumber(kilograms, 1)} kg`
    : `${trimNumber(kgToPounds(kilograms), 1)} lb`;
}

export function formatWeeklyRate(weeklyRateKg: number, unitSystem: UnitSystem): string {
  return unitSystem === 'metric'
    ? `${trimNumber(weeklyRateKg, 2)} kg per week`
    : `${trimNumber(kgToPounds(weeklyRateKg), 2)} lb per week`;
}

export type WeeklyRateOption = {
  weeklyRateKg: number;
  label: string;
};

export function getWeeklyRateOptions(weightGoal: WeightGoal, unitSystem: UnitSystem): WeeklyRateOption[] {
  if (weightGoal === 'maintain') {
    return [];
  }
  return WEEKLY_RATE_OPTIONS[unitSystem][weightGoal].map((amount) => {
    const weeklyRateKg = unitSystem === 'metric' ? amount : poundsToKg(amount);
    return { weeklyRateKg, label: formatWeeklyRate(weeklyRateKg, unitSystem) };
  });
}

export function isSameWeeklyRate(a: number, b: number): boolean {
  return Math.abs(a - b) < RATE_TOLERANCE_KG;
}

export function isAllowedWeeklyRate(weightGoal: WeightGoal, weeklyRateKg: number): boolean {
  if (weightGoal === 'maintain') {
    return weeklyRateKg === 0;
  }
  return UNIT_SYSTEMS.some((unitSystem) =>
    getWeeklyRateOptions(weightGoal, unitSystem).some((option) =>
      isSameWeeklyRate(option.weeklyRateKg, weeklyRateKg),
    ),
  );
}
