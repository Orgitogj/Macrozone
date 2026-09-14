import type { Meal } from '@/features/meals/types';
import { normalizeStoredMeal } from '@/features/meals/utils/mealRecords';
import type { SqlValue } from '@/storage/database/types';

export type MealRow = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_type: string;
  local_date: string;
  local_time: string | null;
  created_at: string;
  updated_at: string;
  extra_json: string | null;
};

export const MEAL_COLUMNS =
  'id, name, calories, protein, carbs, fat, meal_type, local_date, local_time, created_at, updated_at, extra_json';

export const INSERT_MEAL_SQL = `INSERT INTO meals (${MEAL_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const KNOWN_RECORD_KEYS = new Set([
  'id',
  'name',
  'calories',
  'protein',
  'carbs',
  'fat',
  'mealType',
  'date',
  'time',
  'createdAt',
  'updatedAt',
]);

export function rowToMeal(row: MealRow): Meal | null {
  return normalizeStoredMeal({
    id: row.id,
    name: row.name,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    mealType: row.meal_type,
    date: row.local_date,
    time: row.local_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function mealToRowValues(meal: Meal, extraJson: string | null): SqlValue[] {
  return [
    meal.id,
    meal.name,
    meal.calories,
    meal.protein,
    meal.carbs,
    meal.fat,
    meal.mealType,
    meal.date,
    meal.time,
    meal.createdAt,
    meal.updatedAt,
    extraJson,
  ];
}

export function extractExtraFieldsJson(record: Record<string, unknown>): string | null {
  const extra = Object.fromEntries(
    Object.entries(record).filter(([key]) => !KNOWN_RECORD_KEYS.has(key)),
  );
  return Object.keys(extra).length === 0 ? null : JSON.stringify(extra);
}

export function areMealsEqual(a: Meal, b: Meal): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.calories === b.calories &&
    a.protein === b.protein &&
    a.carbs === b.carbs &&
    a.fat === b.fat &&
    a.mealType === b.mealType &&
    a.date === b.date &&
    a.time === b.time &&
    a.createdAt === b.createdAt &&
    a.updatedAt === b.updatedAt
  );
}
