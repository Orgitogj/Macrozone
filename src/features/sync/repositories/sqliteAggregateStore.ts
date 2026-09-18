import { LIBRARY_LIMITS } from '@/features/library/constants';
import { parseRecipeRecord, parseSavedMealRecord } from '@/features/library/utils/libraryRecords';
import { toNameKey } from '@/features/library/utils/librarySearch';
import { selectFood } from '@/features/library/repositories/sqliteFoodRepository';
import type { FoodPortion } from '@/features/library/types';
import { ONBOARDING_METADATA_KEY } from '@/features/nutrition-goals/repositories/sqliteNutritionPlanRepository';
import {
  isOnboardingStatus,
  parseBodyProfile,
  parseSavedGoals,
} from '@/features/nutrition-goals/repositories/nutritionPlanRepository';
import type { NutritionPlan } from '@/features/nutrition-goals/types';
import { insertMealEntrySource, selectMealEntrySource } from '@/features/meals/repositories/sqliteDiaryLogRepository';
import { MEAL_COLUMNS, mealToRowValues, rowToMeal, type MealRow } from '@/features/meals/repositories/mealRowMapping';
import type { BarcodeLink, SyncAggregate, SyncEntityType } from '@/features/sync/types';
import { NUTRITION_PLAN_ENTITY_ID } from '@/storage/database/syncSchema';
import type { SqlExecutor, SqlValue } from '@/storage/database/types';

type PortionRow = {
  id: string;
  food_id: string | null;
  food_name: string;
  serving_amount: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  amount: number;
};

const PORTION_COLUMNS = 'id, food_id, food_name, serving_amount, serving_unit, calories, protein, carbs, fat, amount';

const UPSERT_MEAL_SQL = `INSERT INTO meals (${MEAL_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (id) DO UPDATE SET
    name = excluded.name, calories = excluded.calories, protein = excluded.protein, carbs = excluded.carbs,
    fat = excluded.fat, meal_type = excluded.meal_type, local_date = excluded.local_date,
    local_time = excluded.local_time, created_at = excluded.created_at, updated_at = excluded.updated_at`;

const UPSERT_FOOD_SQL = `INSERT INTO foods (id, name, name_key, serving_amount, serving_unit, calories, protein, carbs, fat, is_favorite, favorited_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (id) DO UPDATE SET
    name = excluded.name, name_key = excluded.name_key, serving_amount = excluded.serving_amount,
    serving_unit = excluded.serving_unit, calories = excluded.calories, protein = excluded.protein,
    carbs = excluded.carbs, fat = excluded.fat, is_favorite = excluded.is_favorite,
    favorited_at = excluded.favorited_at, created_at = excluded.created_at, updated_at = excluded.updated_at`;

function portionRows(rows: readonly PortionRow[]): FoodPortion[] {
  return rows.map((row) => ({
    id: row.id,
    foodId: row.food_id,
    foodName: row.food_name,
    serving: { amount: row.serving_amount, unit: row.serving_unit as FoodPortion['serving']['unit'] },
    nutrition: { calories: row.calories, protein: row.protein, carbs: row.carbs, fat: row.fat },
    amount: row.amount,
  }));
}

async function readMeal(executor: SqlExecutor, id: string): Promise<SyncAggregate | null> {
  const row = await executor.getFirstAsync<MealRow>(`SELECT ${MEAL_COLUMNS} FROM meals WHERE id = ?`, [id]);
  if (row === null) {
    return null;
  }
  const meal = rowToMeal(row);
  if (meal === null) {
    return null;
  }
  const source = await selectMealEntrySource(executor, id);
  return { type: 'meal', id, meal, source };
}

async function readFood(executor: SqlExecutor, id: string): Promise<SyncAggregate | null> {
  const food = await selectFood(executor, id);
  if (food === null) {
    return null;
  }
  const rows = await executor.getAllAsync<{ barcode: string; linked_at: string }>(
    'SELECT barcode, linked_at FROM food_barcodes WHERE food_id = ? ORDER BY barcode',
    [id],
  );
  const barcodes: BarcodeLink[] = rows.map((row) => ({ barcode: row.barcode, linkedAt: row.linked_at }));
  return { type: 'food', id, food, barcodes };
}

async function readSavedMeal(executor: SqlExecutor, id: string): Promise<SyncAggregate | null> {
  const row = await executor.getFirstAsync<{ id: string; name: string; created_at: string; updated_at: string }>(
    'SELECT id, name, created_at, updated_at FROM saved_meals WHERE id = ?',
    [id],
  );
  if (row === null) {
    return null;
  }
  const items = await executor.getAllAsync<PortionRow>(
    `SELECT ${PORTION_COLUMNS} FROM saved_meal_items WHERE saved_meal_id = ? ORDER BY position`,
    [id],
  );
  const savedMeal = parseSavedMealRecord({
    id: row.id,
    name: row.name,
    items: portionRows(items),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
  return savedMeal === null ? null : { type: 'saved_meal', id, savedMeal };
}

async function readRecipe(executor: SqlExecutor, id: string): Promise<SyncAggregate | null> {
  const row = await executor.getFirstAsync<{ id: string; name: string; servings: number; created_at: string; updated_at: string }>(
    'SELECT id, name, servings, created_at, updated_at FROM recipes WHERE id = ?',
    [id],
  );
  if (row === null) {
    return null;
  }
  const ingredients = await executor.getAllAsync<PortionRow>(
    `SELECT ${PORTION_COLUMNS} FROM recipe_ingredients WHERE recipe_id = ? ORDER BY position`,
    [id],
  );
  const recipe = parseRecipeRecord({
    id: row.id,
    name: row.name,
    servings: row.servings,
    ingredients: portionRows(ingredients),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
  return recipe === null ? null : { type: 'recipe', id, recipe };
}

export async function readNutritionPlan(executor: SqlExecutor): Promise<NutritionPlan> {
  const profileRow = await executor.getFirstAsync<Record<string, unknown>>(
    'SELECT unit_system, sex, age_years, height_cm, weight_kg, activity_level, weight_goal, weekly_rate_kg, updated_at FROM user_profile WHERE id = 1',
    [],
  );
  const goalsRow = await executor.getFirstAsync<Record<string, unknown>>(
    'SELECT calories, protein, carbs, fat, source, updated_at FROM nutrition_goals WHERE id = 1',
    [],
  );
  const statusRow = await executor.getFirstAsync<{ value: string }>('SELECT value FROM app_metadata WHERE key = ?', [
    ONBOARDING_METADATA_KEY,
  ]);
  let onboardingStatus: NutritionPlan['onboardingStatus'] = null;
  if (statusRow !== null) {
    try {
      const parsed: unknown = JSON.parse(statusRow.value);
      const status = typeof parsed === 'object' && parsed !== null ? (parsed as { status?: unknown }).status : null;
      onboardingStatus = isOnboardingStatus(status) ? status : null;
    } catch {
      onboardingStatus = null;
    }
  }
  return {
    profile: profileRow
      ? parseBodyProfile({
          unitSystem: profileRow.unit_system,
          sex: profileRow.sex,
          ageYears: profileRow.age_years,
          heightCm: profileRow.height_cm,
          weightKg: profileRow.weight_kg,
          activityLevel: profileRow.activity_level,
          weightGoal: profileRow.weight_goal,
          weeklyRateKg: profileRow.weekly_rate_kg,
          updatedAt: profileRow.updated_at,
        })
      : null,
    goals: goalsRow
      ? parseSavedGoals({
          calories: goalsRow.calories,
          protein: goalsRow.protein,
          carbs: goalsRow.carbs,
          fat: goalsRow.fat,
          source: goalsRow.source,
          updatedAt: goalsRow.updated_at,
        })
      : null,
    onboardingStatus,
  };
}

export async function readAggregate(executor: SqlExecutor, entityType: SyncEntityType, entityId: string): Promise<SyncAggregate | null> {
  switch (entityType) {
    case 'meal':
      return readMeal(executor, entityId);
    case 'food':
      return readFood(executor, entityId);
    case 'saved_meal':
      return readSavedMeal(executor, entityId);
    case 'recipe':
      return readRecipe(executor, entityId);
    case 'nutrition_plan': {
      const plan = await readNutritionPlan(executor);
      const isEmpty = plan.profile === null && plan.goals === null && plan.onboardingStatus === null;
      return isEmpty ? null : { type: 'nutrition_plan', id: NUTRITION_PLAN_ENTITY_ID, plan };
    }
  }
}

export async function listAggregateIds(executor: SqlExecutor, entityType: SyncEntityType): Promise<string[]> {
  switch (entityType) {
    case 'meal':
      return (await executor.getAllAsync<{ id: string }>('SELECT id FROM meals ORDER BY created_at, id', [])).map((row) => row.id);
    case 'food':
      return (await executor.getAllAsync<{ id: string }>('SELECT id FROM foods ORDER BY created_at, id', [])).map((row) => row.id);
    case 'saved_meal':
      return (await executor.getAllAsync<{ id: string }>('SELECT id FROM saved_meals ORDER BY created_at, id', [])).map((row) => row.id);
    case 'recipe':
      return (await executor.getAllAsync<{ id: string }>('SELECT id FROM recipes ORDER BY created_at, id', [])).map((row) => row.id);
    case 'nutrition_plan': {
      const plan = await readAggregate(executor, 'nutrition_plan', NUTRITION_PLAN_ENTITY_ID);
      return plan === null ? [] : [NUTRITION_PLAN_ENTITY_ID];
    }
  }
}

export async function findDuplicateFoodId(executor: SqlExecutor, aggregate: SyncAggregate): Promise<string | null> {
  if (aggregate.type !== 'food') {
    return null;
  }
  const { food } = aggregate;
  const row = await executor.getFirstAsync<{ id: string }>(
    `SELECT id FROM foods
     WHERE name_key = ? AND serving_unit = ? AND serving_amount = ? AND calories = ? AND protein = ? AND carbs = ? AND fat = ? AND id <> ?
     LIMIT 1`,
    [
      toNameKey(food.name),
      food.serving.unit,
      food.serving.amount,
      food.nutrition.calories,
      food.nutrition.protein,
      food.nutrition.carbs,
      food.nutrition.fat,
      food.id,
    ],
  );
  return row?.id ?? null;
}

async function writePortions(
  transaction: SqlExecutor,
  table: 'saved_meal_items' | 'recipe_ingredients',
  parentColumn: 'saved_meal_id' | 'recipe_id',
  parentId: string,
  portions: readonly FoodPortion[],
): Promise<void> {
  await transaction.runAsync(`DELETE FROM ${table} WHERE ${parentColumn} = ?`, [parentId]);
  for (const [position, portion] of portions.entries()) {
    await transaction.runAsync(
      `INSERT INTO ${table} (id, ${parentColumn}, position, food_id, food_name, serving_amount, serving_unit, calories, protein, carbs, fat, amount)
       VALUES (?, ?, ?, (SELECT id FROM foods WHERE id = ?), ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        portion.id,
        parentId,
        position,
        portion.foodId,
        portion.foodName,
        portion.serving.amount,
        portion.serving.unit,
        portion.nutrition.calories,
        portion.nutrition.protein,
        portion.nutrition.carbs,
        portion.nutrition.fat,
        portion.amount,
      ] satisfies SqlValue[],
    );
  }
}

export type BarcodeReassignment = { barcode: string; previousFoodId: string };

export async function writeAggregate(transaction: SqlExecutor, aggregate: SyncAggregate): Promise<BarcodeReassignment[]> {
  switch (aggregate.type) {
    case 'meal': {
      await transaction.runAsync(UPSERT_MEAL_SQL, mealToRowValues(aggregate.meal, null));
      await transaction.runAsync('DELETE FROM meal_entry_sources WHERE meal_id = ?', [aggregate.id]);
      await transaction.runAsync('DELETE FROM meal_entry_ai_sources WHERE meal_id = ?', [aggregate.id]);
      await transaction.runAsync('DELETE FROM meal_entry_product_sources WHERE meal_id = ?', [aggregate.id]);
      if (aggregate.source !== null) {
        await insertMealEntrySource(transaction, aggregate.id, aggregate.source);
      }
      return [];
    }
    case 'food': {
      const { food } = aggregate;
      await transaction.runAsync(UPSERT_FOOD_SQL, [
        food.id,
        food.name,
        toNameKey(food.name),
        food.serving.amount,
        food.serving.unit,
        food.nutrition.calories,
        food.nutrition.protein,
        food.nutrition.carbs,
        food.nutrition.fat,
        food.isFavorite ? 1 : 0,
        food.favoritedAt,
        food.createdAt,
        food.updatedAt,
      ]);
      const reassignments: BarcodeReassignment[] = [];
      const keep = aggregate.barcodes.map((link) => link.barcode);
      const existing = await transaction.getAllAsync<{ barcode: string }>('SELECT barcode FROM food_barcodes WHERE food_id = ?', [
        aggregate.id,
      ]);
      for (const row of existing) {
        if (!keep.includes(row.barcode)) {
          await transaction.runAsync('DELETE FROM food_barcodes WHERE barcode = ?', [row.barcode]);
        }
      }
      for (const link of aggregate.barcodes) {
        const current = await transaction.getFirstAsync<{ food_id: string }>('SELECT food_id FROM food_barcodes WHERE barcode = ?', [
          link.barcode,
        ]);
        if (current !== null && current.food_id !== aggregate.id) {
          reassignments.push({ barcode: link.barcode, previousFoodId: current.food_id });
          await transaction.runAsync('DELETE FROM food_barcodes WHERE barcode = ?', [link.barcode]);
        }
        await transaction.runAsync(
          `INSERT INTO food_barcodes (barcode, food_id, linked_at) VALUES (?, ?, ?)
           ON CONFLICT (barcode) DO UPDATE SET food_id = excluded.food_id, linked_at = excluded.linked_at`,
          [link.barcode, aggregate.id, link.linkedAt],
        );
      }
      return reassignments;
    }
    case 'saved_meal': {
      const { savedMeal } = aggregate;
      if (savedMeal.items.length > LIBRARY_LIMITS.maxSavedMealItems) {
        throw new Error('Saved meal has too many items.');
      }
      await transaction.runAsync(
        `INSERT INTO saved_meals (id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET name = excluded.name, name_key = excluded.name_key,
           created_at = excluded.created_at, updated_at = excluded.updated_at`,
        [savedMeal.id, savedMeal.name, toNameKey(savedMeal.name), savedMeal.createdAt, savedMeal.updatedAt],
      );
      await writePortions(transaction, 'saved_meal_items', 'saved_meal_id', savedMeal.id, savedMeal.items);
      return [];
    }
    case 'recipe': {
      const { recipe } = aggregate;
      if (recipe.ingredients.length > LIBRARY_LIMITS.maxRecipeIngredients) {
        throw new Error('Recipe has too many ingredients.');
      }
      await transaction.runAsync(
        `INSERT INTO recipes (id, name, name_key, servings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET name = excluded.name, name_key = excluded.name_key, servings = excluded.servings,
           created_at = excluded.created_at, updated_at = excluded.updated_at`,
        [recipe.id, recipe.name, toNameKey(recipe.name), recipe.servings, recipe.createdAt, recipe.updatedAt],
      );
      await writePortions(transaction, 'recipe_ingredients', 'recipe_id', recipe.id, recipe.ingredients);
      return [];
    }
    case 'nutrition_plan': {
      const { plan } = aggregate;
      if (plan.profile === null) {
        await transaction.runAsync('DELETE FROM user_profile WHERE id = 1', []);
      } else {
        await transaction.runAsync(
          `INSERT INTO user_profile (id, unit_system, sex, age_years, height_cm, weight_kg, activity_level, weight_goal, weekly_rate_kg, updated_at)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET unit_system = excluded.unit_system, sex = excluded.sex, age_years = excluded.age_years,
             height_cm = excluded.height_cm, weight_kg = excluded.weight_kg, activity_level = excluded.activity_level,
             weight_goal = excluded.weight_goal, weekly_rate_kg = excluded.weekly_rate_kg, updated_at = excluded.updated_at`,
          [
            plan.profile.unitSystem,
            plan.profile.sex,
            plan.profile.ageYears,
            plan.profile.heightCm,
            plan.profile.weightKg,
            plan.profile.activityLevel,
            plan.profile.weightGoal,
            plan.profile.weeklyRateKg,
            plan.profile.updatedAt,
          ],
        );
      }
      if (plan.goals === null) {
        await transaction.runAsync('DELETE FROM nutrition_goals WHERE id = 1', []);
      } else {
        await transaction.runAsync(
          `INSERT INTO nutrition_goals (id, calories, protein, carbs, fat, source, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET calories = excluded.calories, protein = excluded.protein, carbs = excluded.carbs,
             fat = excluded.fat, source = excluded.source, updated_at = excluded.updated_at`,
          [plan.goals.calories, plan.goals.protein, plan.goals.carbs, plan.goals.fat, plan.goals.source, plan.goals.updatedAt],
        );
      }
      if (plan.onboardingStatus === null) {
        await transaction.runAsync('DELETE FROM app_metadata WHERE key = ?', [ONBOARDING_METADATA_KEY]);
      } else {
        await transaction.runAsync(
          `INSERT INTO app_metadata (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
          [ONBOARDING_METADATA_KEY, JSON.stringify({ status: plan.onboardingStatus }), new Date().toISOString()],
        );
      }
      return [];
    }
  }
}

export async function deleteAggregate(transaction: SqlExecutor, entityType: SyncEntityType, entityId: string): Promise<void> {
  switch (entityType) {
    case 'meal':
      await transaction.runAsync('DELETE FROM meals WHERE id = ?', [entityId]);
      return;
    case 'food':
      await transaction.runAsync('UPDATE meal_entry_ai_sources SET matched_food_id = NULL WHERE matched_food_id = ?', [entityId]);
      await transaction.runAsync('UPDATE meal_entry_product_sources SET food_id = NULL WHERE food_id = ?', [entityId]);
      await transaction.runAsync('DELETE FROM food_barcodes WHERE food_id = ?', [entityId]);
      await transaction.runAsync('DELETE FROM foods WHERE id = ?', [entityId]);
      return;
    case 'saved_meal':
      await transaction.runAsync('UPDATE meal_entry_sources SET saved_meal_id = NULL WHERE saved_meal_id = ?', [entityId]);
      await transaction.runAsync('DELETE FROM saved_meal_items WHERE saved_meal_id = ?', [entityId]);
      await transaction.runAsync('DELETE FROM saved_meals WHERE id = ?', [entityId]);
      return;
    case 'recipe':
      await transaction.runAsync('UPDATE meal_entry_sources SET recipe_id = NULL WHERE recipe_id = ?', [entityId]);
      await transaction.runAsync('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [entityId]);
      await transaction.runAsync('DELETE FROM recipes WHERE id = ?', [entityId]);
      return;
    case 'nutrition_plan':
      await transaction.runAsync('DELETE FROM user_profile WHERE id = 1', []);
      await transaction.runAsync('DELETE FROM nutrition_goals WHERE id = 1', []);
      await transaction.runAsync('DELETE FROM app_metadata WHERE key = ?', [ONBOARDING_METADATA_KEY]);
      return;
  }
}
