import { BODY_PROFILE_LIMITS } from '@/features/profile/constants';
import type {
  ActivityLevel,
  BodyProfile,
  BodyProfileInput,
  FormulaSex,
  UnitSystem,
  WeightGoal,
} from '@/features/profile/types';
import {
  CM_PER_INCH,
  cmToFeetAndInches,
  feetAndInchesToCm,
  getWeeklyRateOptions,
  INCHES_PER_FOOT,
  isActivityLevel,
  isFormulaSex,
  isSameWeeklyRate,
  isWeightGoal,
  kgToPounds,
  poundsToKg,
} from '@/features/profile/utils/units';
import { roundTo } from '@/utils/math';
import { parseDecimalInput } from '@/utils/numberInput';

export type BodyProfileFormValues = {
  unitSystem: UnitSystem;
  sex: FormulaSex | null;
  age: string;
  heightCm: string;
  heightFeet: string;
  heightInches: string;
  weight: string;
  activityLevel: ActivityLevel | null;
  weightGoal: WeightGoal | null;
  weeklyRateKg: number | null;
};

export type BodyProfileErrorField =
  | 'sex'
  | 'age'
  | 'height'
  | 'weight'
  | 'activityLevel'
  | 'weightGoal'
  | 'weeklyRateKg';

export type BodyProfileErrors = Partial<Record<BodyProfileErrorField, string>>;

export type BodyProfileStep = 'body' | 'activity' | 'goal';

export const BODY_PROFILE_STEP_FIELDS: Readonly<Record<BodyProfileStep, readonly BodyProfileErrorField[]>> = {
  body: ['sex', 'age', 'height', 'weight'],
  activity: ['activityLevel'],
  goal: ['weightGoal', 'weeklyRateKg'],
};

export type BodyProfileValidationResult =
  | { ok: true; input: BodyProfileInput }
  | { ok: false; errors: BodyProfileErrors };

const ceilTo = (value: number, digits: number) => Math.ceil(value * 10 ** digits - 1e-9) / 10 ** digits;
const floorTo = (value: number, digits: number) => Math.floor(value * 10 ** digits + 1e-9) / 10 ** digits;

const IMPERIAL_LIMITS = {
  minHeightInches: ceilTo(BODY_PROFILE_LIMITS.minHeightCm / CM_PER_INCH, 1),
  maxHeightInches: floorTo(BODY_PROFILE_LIMITS.maxHeightCm / CM_PER_INCH, 1),
  minWeightPounds: ceilTo(kgToPounds(BODY_PROFILE_LIMITS.minWeightKg), 1),
  maxWeightPounds: floorTo(kgToPounds(BODY_PROFILE_LIMITS.maxWeightKg), 1),
};

function formatInches(totalInches: number): string {
  const feet = Math.floor(totalInches / INCHES_PER_FOOT);
  return `${feet} ft ${roundTo(totalInches - feet * INCHES_PER_FOOT, 1)} in`;
}

function parseAmount(text: string): number | null {
  const result = parseDecimalInput(text, BODY_PROFILE_LIMITS.maxDecimalPlaces);
  return result.kind === 'number' ? result.value : null;
}

export function createEmptyBodyProfileFormValues(unitSystem: UnitSystem = 'metric'): BodyProfileFormValues {
  return {
    unitSystem,
    sex: null,
    age: '',
    heightCm: '',
    heightFeet: '',
    heightInches: '',
    weight: '',
    activityLevel: null,
    weightGoal: null,
    weeklyRateKg: null,
  };
}

function heightStrings(heightCm: number): Pick<BodyProfileFormValues, 'heightCm' | 'heightFeet' | 'heightInches'> {
  const { feet, inches } = cmToFeetAndInches(heightCm);
  return { heightCm: String(roundTo(heightCm, 1)), heightFeet: String(feet), heightInches: String(inches) };
}

export function bodyProfileToFormValues(profile: BodyProfile | BodyProfileInput): BodyProfileFormValues {
  return {
    unitSystem: profile.unitSystem,
    sex: profile.sex,
    age: String(profile.ageYears),
    ...heightStrings(profile.heightCm),
    weight: String(
      roundTo(profile.unitSystem === 'metric' ? profile.weightKg : kgToPounds(profile.weightKg), 1),
    ),
    activityLevel: profile.activityLevel,
    weightGoal: profile.weightGoal,
    weeklyRateKg: profile.weightGoal === 'maintain' ? 0 : profile.weeklyRateKg,
  };
}

function parseHeightCm(values: BodyProfileFormValues): number | null {
  if (values.unitSystem === 'metric') {
    return parseAmount(values.heightCm);
  }
  const feet = /^\d$/.test(values.heightFeet.trim()) ? Number(values.heightFeet.trim()) : null;
  const inches = values.heightInches.trim() === '' ? 0 : parseAmount(values.heightInches);
  if (feet === null || inches === null || inches >= INCHES_PER_FOOT) {
    return null;
  }
  return feetAndInchesToCm(feet, inches);
}

function parseWeightKg(values: BodyProfileFormValues): number | null {
  const amount = parseAmount(values.weight);
  if (amount === null) {
    return null;
  }
  return values.unitSystem === 'metric' ? amount : poundsToKg(amount);
}

export function convertBodyProfileFormUnits(
  values: BodyProfileFormValues,
  unitSystem: UnitSystem,
): BodyProfileFormValues {
  if (values.unitSystem === unitSystem) {
    return values;
  }
  const heightCm = parseHeightCm(values);
  const weightKg = parseWeightKg(values);
  const weeklyRateKg =
    values.weightGoal !== null &&
    values.weeklyRateKg !== null &&
    (values.weightGoal === 'maintain' ||
      getWeeklyRateOptions(values.weightGoal, unitSystem).some((option) =>
        isSameWeeklyRate(option.weeklyRateKg, values.weeklyRateKg ?? -1),
      ))
      ? values.weeklyRateKg
      : null;

  return {
    ...values,
    unitSystem,
    ...(heightCm === null ? { heightCm: '', heightFeet: '', heightInches: '' } : heightStrings(heightCm)),
    weight:
      weightKg === null
        ? ''
        : String(roundTo(unitSystem === 'metric' ? weightKg : kgToPounds(weightKg), 1)),
    weeklyRateKg,
  };
}

export function validateBodyProfileForm(values: BodyProfileFormValues): BodyProfileValidationResult {
  const errors: BodyProfileErrors = {};
  const limits = BODY_PROFILE_LIMITS;

  if (!isFormulaSex(values.sex)) {
    errors.sex = 'Choose the option to use in the calculation.';
  }

  const ageText = values.age.trim();
  const ageYears = /^\d{1,3}$/.test(ageText) ? Number(ageText) : null;
  if (ageYears === null) {
    errors.age = 'Enter your age in whole years.';
  } else if (ageYears < limits.minAgeYears) {
    errors.age =
      'The calculator is designed for adults 18 and over. Enter goals manually or talk to a health professional.';
  } else if (ageYears > limits.maxAgeYears) {
    errors.age = `Enter an age between ${limits.minAgeYears} and ${limits.maxAgeYears}.`;
  }

  const heightCm = parseHeightCm(values);
  if (values.unitSystem === 'metric') {
    if (heightCm === null || heightCm < limits.minHeightCm || heightCm > limits.maxHeightCm) {
      errors.height = `Enter a height between ${limits.minHeightCm} and ${limits.maxHeightCm} cm.`;
    }
  } else {
    const totalInches = heightCm === null ? null : roundTo(heightCm / CM_PER_INCH, 1);
    if (
      totalInches === null ||
      totalInches < IMPERIAL_LIMITS.minHeightInches ||
      totalInches > IMPERIAL_LIMITS.maxHeightInches
    ) {
      errors.height = `Enter a height between ${formatInches(IMPERIAL_LIMITS.minHeightInches)} and ${formatInches(IMPERIAL_LIMITS.maxHeightInches)}.`;
    }
  }

  const weightKg = parseWeightKg(values);
  if (values.unitSystem === 'metric') {
    if (weightKg === null || weightKg < limits.minWeightKg || weightKg > limits.maxWeightKg) {
      errors.weight = `Enter a weight between ${limits.minWeightKg} and ${limits.maxWeightKg} kg.`;
    }
  } else {
    const pounds = weightKg === null ? null : roundTo(kgToPounds(weightKg), 1);
    if (pounds === null || pounds < IMPERIAL_LIMITS.minWeightPounds || pounds > IMPERIAL_LIMITS.maxWeightPounds) {
      errors.weight = `Enter a weight between ${IMPERIAL_LIMITS.minWeightPounds} and ${IMPERIAL_LIMITS.maxWeightPounds} lb.`;
    }
  }

  if (!isActivityLevel(values.activityLevel)) {
    errors.activityLevel = 'Choose your activity level.';
  }

  if (!isWeightGoal(values.weightGoal)) {
    errors.weightGoal = 'Choose a goal.';
  } else if (values.weightGoal !== 'maintain') {
    const allowed = getWeeklyRateOptions(values.weightGoal, values.unitSystem).some(
      (option) => values.weeklyRateKg !== null && isSameWeeklyRate(option.weeklyRateKg, values.weeklyRateKg),
    );
    if (!allowed) {
      errors.weeklyRateKg = 'Choose how quickly you want to change.';
    }
  }

  if (
    Object.keys(errors).length > 0 ||
    values.sex === null ||
    ageYears === null ||
    heightCm === null ||
    weightKg === null ||
    values.activityLevel === null ||
    values.weightGoal === null
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: {
      unitSystem: values.unitSystem,
      sex: values.sex,
      ageYears,
      heightCm: roundTo(heightCm, 2),
      weightKg: roundTo(weightKg, 3),
      activityLevel: values.activityLevel,
      weightGoal: values.weightGoal,
      weeklyRateKg: values.weightGoal === 'maintain' ? 0 : (values.weeklyRateKg ?? 0),
    },
  };
}

export function pickStepErrors(errors: BodyProfileErrors, step: BodyProfileStep): BodyProfileErrors {
  const stepErrors: BodyProfileErrors = {};
  for (const field of BODY_PROFILE_STEP_FIELDS[step]) {
    if (errors[field]) {
      stepErrors[field] = errors[field];
    }
  }
  return stepErrors;
}
