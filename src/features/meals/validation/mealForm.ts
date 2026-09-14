import { MEAL_LIMITS } from '@/features/meals/constants';
import type { Meal, MealInput, MealType } from '@/features/meals/types';
import { inferMealTypeFromDate, isMealType } from '@/features/meals/utils/mealType';
import type { MacroKey } from '@/types/nutrition';
import {
  compareDateKeys,
  isLocalDateKey,
  toLocalDateKey,
  type LocalDateKey,
} from '@/utils/date';
import { formatCalories, formatGrams } from '@/utils/format';
import { formatNumberForInput, parseDecimalInput } from '@/utils/numberInput';
import { isLocalTime, type LocalTime } from '@/utils/time';

export type MealFormValues = {
  name: string;
  mealType: MealType;
  date: LocalDateKey;
  time: LocalTime | null;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
};

export type MealFormField = keyof MealFormValues;

export type MealFormErrors = Partial<Record<MealFormField, string>>;

export type MealFormValidationResult =
  | { ok: true; input: MealInput }
  | { ok: false; errors: MealFormErrors };

export const MEAL_FORM_FIELDS: readonly MealFormField[] = [
  'name',
  'mealType',
  'date',
  'time',
  'calories',
  'protein',
  'carbs',
  'fat',
];

const MACRO_FIELD_LABELS: Record<MacroKey, string> = {
  calories: 'Calories',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
};

export function createEmptyMealFormValues(now: Date): MealFormValues {
  return {
    name: '',
    mealType: inferMealTypeFromDate(now),
    date: toLocalDateKey(now),
    time: null,
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  };
}

export function mealToFormValues(meal: Meal): MealFormValues {
  return {
    name: meal.name,
    mealType: meal.mealType,
    date: meal.date,
    time: meal.time,
    calories: formatNumberForInput(meal.calories),
    protein: formatNumberForInput(meal.protein),
    carbs: formatNumberForInput(meal.carbs),
    fat: formatNumberForInput(meal.fat),
  };
}

export function createDuplicateFormValues(
  meal: Meal,
  todayKey: LocalDateKey,
): MealFormValues {
  return { ...mealToFormValues(meal), date: todayKey, time: null };
}

export function areMealFormValuesEqual(a: MealFormValues, b: MealFormValues): boolean {
  return MEAL_FORM_FIELDS.every((field) => a[field] === b[field]);
}

function validateAmount(
  key: MacroKey,
  text: string,
  { required, max }: { required: boolean; max: number },
): { value: number } | { error: string } {
  const label = MACRO_FIELD_LABELS[key];
  const result = parseDecimalInput(text, MEAL_LIMITS.maxDecimalPlaces);
  switch (result.kind) {
    case 'empty':
      return required ? { error: `${label} is required.` } : { value: 0 };
    case 'negative':
      return { error: `${label} can't be negative.` };
    case 'tooManyDecimals':
      return {
        error: `Use a number with up to ${MEAL_LIMITS.maxDecimalPlaces} decimal places, without thousands separators.`,
      };
    case 'invalid':
      return { error: 'Enter a number, for example 12.5.' };
    case 'number': {
      if (result.value > max) {
        const formattedMax = key === 'calories' ? `${formatCalories(max)} kcal` : formatGrams(max);
        return { error: `${label} must be at most ${formattedMax}.` };
      }
      return { value: result.value };
    }
  }
}

export function validateMealForm(
  values: MealFormValues,
  todayKey: LocalDateKey,
): MealFormValidationResult {
  const errors: MealFormErrors = {};

  const name = values.name.trim();
  if (name === '') {
    errors.name = 'Enter a meal name.';
  } else if (name.length > MEAL_LIMITS.nameMaxLength) {
    errors.name = `Use ${MEAL_LIMITS.nameMaxLength} characters or fewer.`;
  }

  if (!isMealType(values.mealType)) {
    errors.mealType = 'Choose a meal type.';
  }

  if (!isLocalDateKey(values.date)) {
    errors.date = 'Choose a valid date.';
  } else if (compareDateKeys(values.date, todayKey) > 0) {
    errors.date = "The date can't be in the future.";
  }

  if (values.time !== null && !isLocalTime(values.time)) {
    errors.time = 'Choose a valid time or clear it.';
  }

  const amounts = {} as Record<MacroKey, number>;
  const amountRules: readonly [MacroKey, boolean, number][] = [
    ['calories', true, MEAL_LIMITS.maxCalories],
    ['protein', false, MEAL_LIMITS.maxMacroGrams],
    ['carbs', false, MEAL_LIMITS.maxMacroGrams],
    ['fat', false, MEAL_LIMITS.maxMacroGrams],
  ];
  for (const [key, required, max] of amountRules) {
    const result = validateAmount(key, values[key], { required, max });
    if ('error' in result) {
      errors[key] = result.error;
    } else {
      amounts[key] = result.value;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: {
      name,
      mealType: values.mealType,
      date: values.date,
      time: values.time,
      calories: amounts.calories,
      protein: amounts.protein,
      carbs: amounts.carbs,
      fat: amounts.fat,
    },
  };
}
