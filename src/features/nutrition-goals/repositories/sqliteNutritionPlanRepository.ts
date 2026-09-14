import {
  EMPTY_NUTRITION_PLAN,
  isOnboardingStatus,
  NUTRITION_PLAN_MESSAGES,
  NutritionPlanRepositoryError,
  parseBodyProfile,
  parseSavedGoals,
  type NutritionPlanRepository,
  type SaveGoalsRequest,
} from '@/features/nutrition-goals/repositories/nutritionPlanRepository';
import type { NutritionPlan, OnboardingStatus } from '@/features/nutrition-goals/types';
import type { SqlDatabase, SqlExecutor } from '@/storage/database/types';
import { createSerialQueue, type SerialQueue } from '@/utils/serialQueue';

export const ONBOARDING_METADATA_KEY = 'onboarding';

type ProfileRow = {
  unit_system: string;
  sex: string;
  age_years: number;
  height_cm: number;
  weight_kg: number;
  activity_level: string;
  weight_goal: string;
  weekly_rate_kg: number;
  updated_at: string;
};

type GoalsRow = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: string;
  updated_at: string;
};

function parseOnboardingStatus(value: string | undefined): OnboardingStatus | null {
  if (value === undefined) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    const status = typeof parsed === 'object' && parsed !== null ? (parsed as { status?: unknown }).status : null;
    return isOnboardingStatus(status) ? status : null;
  } catch {
    return null;
  }
}

async function readPlan(executor: SqlExecutor): Promise<NutritionPlan> {
  const profileRow = await executor.getFirstAsync<ProfileRow>(
    'SELECT unit_system, sex, age_years, height_cm, weight_kg, activity_level, weight_goal, weekly_rate_kg, updated_at FROM user_profile WHERE id = 1',
    [],
  );
  const goalsRow = await executor.getFirstAsync<GoalsRow>(
    'SELECT calories, protein, carbs, fat, source, updated_at FROM nutrition_goals WHERE id = 1',
    [],
  );
  const statusRow = await executor.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_metadata WHERE key = ?',
    [ONBOARDING_METADATA_KEY],
  );

  return {
    ...EMPTY_NUTRITION_PLAN,
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
    onboardingStatus: parseOnboardingStatus(statusRow?.value),
  };
}

export function createSqliteNutritionPlanRepository(
  getDatabase: () => Promise<SqlDatabase>,
  { queue = createSerialQueue(), now = () => new Date() }: { queue?: SerialQueue; now?: () => Date } = {},
): NutritionPlanRepository {
  const read = async (): Promise<NutritionPlan> => {
    try {
      return await readPlan(await getDatabase());
    } catch (error) {
      throw new NutritionPlanRepositoryError('read_failed', NUTRITION_PLAN_MESSAGES.readFailed, { cause: error });
    }
  };

  const write = (task: (database: SqlDatabase, timestamp: string) => Promise<void>): Promise<NutritionPlan> =>
    queue.run(async () => {
      try {
        const database = await getDatabase();
        await task(database, now().toISOString());
        return await readPlan(database);
      } catch (error) {
        throw new NutritionPlanRepositoryError('write_failed', NUTRITION_PLAN_MESSAGES.writeFailed, { cause: error });
      }
    });

  return {
    getPlan: read,

    saveGoals: ({ goals, source, profile }: SaveGoalsRequest) =>
      write((database, timestamp) =>
        database.withExclusiveTransactionAsync(async (transaction) => {
          if (profile) {
            await transaction.runAsync(
              `INSERT INTO user_profile (id, unit_system, sex, age_years, height_cm, weight_kg, activity_level, weight_goal, weekly_rate_kg, updated_at)
               VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET unit_system = excluded.unit_system, sex = excluded.sex, age_years = excluded.age_years,
                 height_cm = excluded.height_cm, weight_kg = excluded.weight_kg, activity_level = excluded.activity_level,
                 weight_goal = excluded.weight_goal, weekly_rate_kg = excluded.weekly_rate_kg, updated_at = excluded.updated_at`,
              [
                profile.unitSystem,
                profile.sex,
                profile.ageYears,
                profile.heightCm,
                profile.weightKg,
                profile.activityLevel,
                profile.weightGoal,
                profile.weeklyRateKg,
                timestamp,
              ],
            );
          }
          await transaction.runAsync(
            `INSERT INTO nutrition_goals (id, calories, protein, carbs, fat, source, updated_at)
             VALUES (1, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET calories = excluded.calories, protein = excluded.protein, carbs = excluded.carbs,
               fat = excluded.fat, source = excluded.source, updated_at = excluded.updated_at`,
            [goals.calories, goals.protein, goals.carbs, goals.fat, source, timestamp],
          );
          await transaction.runAsync(
            `INSERT INTO app_metadata (key, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
            [ONBOARDING_METADATA_KEY, JSON.stringify({ status: 'completed' }), timestamp],
          );
        }),
      ),

    skipOnboarding: () =>
      write(async (database, timestamp) => {
        await database.runAsync(
          'INSERT INTO app_metadata (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO NOTHING',
          [ONBOARDING_METADATA_KEY, JSON.stringify({ status: 'skipped' }), timestamp],
        );
      }),
  };
}
