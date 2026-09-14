import type { SqlDatabase, SqlExecutor } from '@/storage/database/types';

export type SchemaMigration = {
  version: number;
  name: string;
  statements: readonly string[];
};

export class DatabaseMigrationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DatabaseMigrationError';
  }
}

export const SCHEMA_MIGRATIONS: readonly SchemaMigration[] = [
  {
    version: 1,
    name: 'create_meals_metadata_and_legacy_records',
    statements: [
      `CREATE TABLE meals (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        calories REAL NOT NULL CHECK (typeof(calories) IN ('integer', 'real')),
        protein REAL NOT NULL CHECK (typeof(protein) IN ('integer', 'real')),
        carbs REAL NOT NULL CHECK (typeof(carbs) IN ('integer', 'real')),
        fat REAL NOT NULL CHECK (typeof(fat) IN ('integer', 'real')),
        meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
        local_date TEXT NOT NULL CHECK (local_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
        local_time TEXT CHECK (local_time IS NULL OR local_time GLOB '[0-2][0-9]:[0-5][0-9]'),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        extra_json TEXT CHECK (extra_json IS NULL OR json_valid(extra_json))
      )`,
      'CREATE INDEX idx_meals_date_time ON meals (local_date, local_time, created_at)',
      'CREATE INDEX idx_meals_date_type ON meals (local_date, meal_type)',
      'CREATE INDEX idx_meals_created_at ON meals (created_at)',
      `CREATE TABLE app_metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL CHECK (json_valid(value)),
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE legacy_meal_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_index INTEGER,
        raw_json TEXT NOT NULL,
        reason TEXT NOT NULL CHECK (reason IN ('unreadable', 'duplicate_id', 'conflict', 'unparseable_source')),
        imported_at TEXT NOT NULL
      )`,
    ],
  },
  {
    version: 2,
    name: 'create_user_profile_and_nutrition_goals',
    statements: [
      `CREATE TABLE user_profile (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        unit_system TEXT NOT NULL CHECK (unit_system IN ('metric', 'imperial')),
        sex TEXT NOT NULL CHECK (sex IN ('female', 'male', 'unspecified')),
        age_years INTEGER NOT NULL CHECK (typeof(age_years) = 'integer' AND age_years > 0),
        height_cm REAL NOT NULL CHECK (typeof(height_cm) IN ('integer', 'real') AND height_cm > 0),
        weight_kg REAL NOT NULL CHECK (typeof(weight_kg) IN ('integer', 'real') AND weight_kg > 0),
        activity_level TEXT NOT NULL CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
        weight_goal TEXT NOT NULL CHECK (weight_goal IN ('lose', 'maintain', 'gain')),
        weekly_rate_kg REAL NOT NULL CHECK (typeof(weekly_rate_kg) IN ('integer', 'real') AND weekly_rate_kg >= 0),
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE nutrition_goals (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        calories REAL NOT NULL CHECK (typeof(calories) IN ('integer', 'real') AND calories >= 0),
        protein REAL NOT NULL CHECK (typeof(protein) IN ('integer', 'real') AND protein >= 0),
        carbs REAL NOT NULL CHECK (typeof(carbs) IN ('integer', 'real') AND carbs >= 0),
        fat REAL NOT NULL CHECK (typeof(fat) IN ('integer', 'real') AND fat >= 0),
        source TEXT NOT NULL CHECK (source IN ('calculated', 'manual')),
        updated_at TEXT NOT NULL
      )`,
    ],
  },
];

export function assertMigrationsOrdered(migrations: readonly SchemaMigration[]): void {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new DatabaseMigrationError(
        `Schema migrations must be numbered consecutively from 1; found version ${migration.version} at position ${index + 1}.`,
      );
    }
  });
}

export async function getSchemaVersion(executor: SqlExecutor): Promise<number> {
  const row = await executor.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  return Number(row?.user_version ?? 0);
}

export async function migrateSchema(
  database: SqlDatabase,
  migrations: readonly SchemaMigration[] = SCHEMA_MIGRATIONS,
): Promise<{ fromVersion: number; toVersion: number }> {
  assertMigrationsOrdered(migrations);
  const fromVersion = await getSchemaVersion(database);
  const latestVersion = migrations.length;

  if (fromVersion > latestVersion) {
    throw new DatabaseMigrationError(
      `The database was created by a newer version of MacroZone (schema ${fromVersion}; this version supports ${latestVersion}).`,
    );
  }

  for (const migration of migrations.slice(fromVersion)) {
    try {
      await database.withExclusiveTransactionAsync(async (transaction) => {
        for (const statement of migration.statements) {
          await transaction.execAsync(statement);
        }
        await transaction.execAsync(`PRAGMA user_version = ${migration.version}`);
      });
    } catch (error) {
      throw new DatabaseMigrationError(
        `Could not apply database migration ${migration.version} (${migration.name}).`,
        { cause: error },
      );
    }
  }

  return { fromVersion, toVersion: latestVersion };
}
