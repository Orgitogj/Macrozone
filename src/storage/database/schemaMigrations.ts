import { SYNC_SCHEMA_STATEMENTS } from '@/storage/database/syncSchema';
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
  {
    version: 3,
    name: 'create_food_library_and_meal_entry_sources',
    statements: [
      `CREATE TABLE foods (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
        name_key TEXT NOT NULL CHECK (length(name_key) BETWEEN 1 AND 80),
        serving_amount REAL NOT NULL CHECK (typeof(serving_amount) IN ('integer', 'real') AND serving_amount > 0 AND serving_amount <= 10000),
        serving_unit TEXT NOT NULL CHECK (serving_unit IN ('g', 'ml', 'serving', 'piece', 'cup', 'tbsp', 'tsp')),
        calories REAL NOT NULL CHECK (typeof(calories) IN ('integer', 'real') AND calories >= 0 AND calories <= 10000),
        protein REAL NOT NULL CHECK (typeof(protein) IN ('integer', 'real') AND protein >= 0 AND protein <= 1000),
        carbs REAL NOT NULL CHECK (typeof(carbs) IN ('integer', 'real') AND carbs >= 0 AND carbs <= 1000),
        fat REAL NOT NULL CHECK (typeof(fat) IN ('integer', 'real') AND fat >= 0 AND fat <= 1000),
        is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
        favorited_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK ((is_favorite = 0 AND favorited_at IS NULL) OR (is_favorite = 1 AND favorited_at IS NOT NULL))
      )`,
      'CREATE UNIQUE INDEX idx_foods_definition ON foods (name_key, serving_unit, serving_amount, calories, protein, carbs, fat)',
      'CREATE INDEX idx_foods_name ON foods (name_key, id)',
      'CREATE INDEX idx_foods_favorites ON foods (is_favorite, name_key, id)',
      `CREATE TABLE saved_meals (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
        name_key TEXT NOT NULL CHECK (length(name_key) BETWEEN 1 AND 80),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      'CREATE INDEX idx_saved_meals_name ON saved_meals (name_key, id)',
      `CREATE TABLE saved_meal_items (
        id TEXT PRIMARY KEY NOT NULL,
        saved_meal_id TEXT NOT NULL REFERENCES saved_meals (id) ON DELETE CASCADE,
        position INTEGER NOT NULL CHECK (typeof(position) = 'integer' AND position >= 0),
        food_id TEXT REFERENCES foods (id) ON DELETE SET NULL,
        food_name TEXT NOT NULL CHECK (length(food_name) BETWEEN 1 AND 80),
        serving_amount REAL NOT NULL CHECK (typeof(serving_amount) IN ('integer', 'real') AND serving_amount > 0),
        serving_unit TEXT NOT NULL CHECK (serving_unit IN ('g', 'ml', 'serving', 'piece', 'cup', 'tbsp', 'tsp')),
        calories REAL NOT NULL CHECK (typeof(calories) IN ('integer', 'real') AND calories >= 0),
        protein REAL NOT NULL CHECK (typeof(protein) IN ('integer', 'real') AND protein >= 0),
        carbs REAL NOT NULL CHECK (typeof(carbs) IN ('integer', 'real') AND carbs >= 0),
        fat REAL NOT NULL CHECK (typeof(fat) IN ('integer', 'real') AND fat >= 0),
        amount REAL NOT NULL CHECK (typeof(amount) IN ('integer', 'real') AND amount > 0),
        UNIQUE (saved_meal_id, position)
      )`,
      'CREATE INDEX idx_saved_meal_items_food ON saved_meal_items (food_id)',
      `CREATE TABLE recipes (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
        name_key TEXT NOT NULL CHECK (length(name_key) BETWEEN 1 AND 80),
        servings REAL NOT NULL CHECK (typeof(servings) IN ('integer', 'real') AND servings > 0 AND servings <= 1000),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      'CREATE INDEX idx_recipes_name ON recipes (name_key, id)',
      `CREATE TABLE recipe_ingredients (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
        position INTEGER NOT NULL CHECK (typeof(position) = 'integer' AND position >= 0),
        food_id TEXT REFERENCES foods (id) ON DELETE SET NULL,
        food_name TEXT NOT NULL CHECK (length(food_name) BETWEEN 1 AND 80),
        serving_amount REAL NOT NULL CHECK (typeof(serving_amount) IN ('integer', 'real') AND serving_amount > 0),
        serving_unit TEXT NOT NULL CHECK (serving_unit IN ('g', 'ml', 'serving', 'piece', 'cup', 'tbsp', 'tsp')),
        calories REAL NOT NULL CHECK (typeof(calories) IN ('integer', 'real') AND calories >= 0),
        protein REAL NOT NULL CHECK (typeof(protein) IN ('integer', 'real') AND protein >= 0),
        carbs REAL NOT NULL CHECK (typeof(carbs) IN ('integer', 'real') AND carbs >= 0),
        fat REAL NOT NULL CHECK (typeof(fat) IN ('integer', 'real') AND fat >= 0),
        amount REAL NOT NULL CHECK (typeof(amount) IN ('integer', 'real') AND amount > 0),
        UNIQUE (recipe_id, position)
      )`,
      'CREATE INDEX idx_recipe_ingredients_food ON recipe_ingredients (food_id)',
      `CREATE TABLE meal_entry_sources (
        meal_id TEXT PRIMARY KEY NOT NULL REFERENCES meals (id) ON DELETE CASCADE,
        source_type TEXT NOT NULL CHECK (source_type IN ('food', 'recipe')),
        food_id TEXT REFERENCES foods (id) ON DELETE SET NULL,
        recipe_id TEXT REFERENCES recipes (id) ON DELETE SET NULL,
        saved_meal_id TEXT REFERENCES saved_meals (id) ON DELETE SET NULL,
        log_group_id TEXT,
        source_name TEXT NOT NULL CHECK (length(source_name) BETWEEN 1 AND 80),
        serving_amount REAL NOT NULL CHECK (typeof(serving_amount) IN ('integer', 'real') AND serving_amount > 0),
        serving_unit TEXT NOT NULL CHECK (serving_unit IN ('g', 'ml', 'serving', 'piece', 'cup', 'tbsp', 'tsp')),
        base_calories REAL NOT NULL CHECK (typeof(base_calories) IN ('integer', 'real') AND base_calories >= 0),
        base_protein REAL NOT NULL CHECK (typeof(base_protein) IN ('integer', 'real') AND base_protein >= 0),
        base_carbs REAL NOT NULL CHECK (typeof(base_carbs) IN ('integer', 'real') AND base_carbs >= 0),
        base_fat REAL NOT NULL CHECK (typeof(base_fat) IN ('integer', 'real') AND base_fat >= 0),
        amount REAL NOT NULL CHECK (typeof(amount) IN ('integer', 'real') AND amount > 0),
        logged_at TEXT NOT NULL,
        CHECK (source_type = 'food' OR food_id IS NULL),
        CHECK (source_type = 'recipe' OR recipe_id IS NULL)
      )`,
      'CREATE INDEX idx_meal_entry_sources_food_recent ON meal_entry_sources (food_id, logged_at)',
      'CREATE INDEX idx_meal_entry_sources_logged_at ON meal_entry_sources (logged_at)',
      'CREATE INDEX idx_meal_entry_sources_group ON meal_entry_sources (log_group_id)',
    ],
  },
  {
    version: 4,
    name: 'create_meal_entry_ai_sources',
    statements: [
      `CREATE TABLE meal_entry_ai_sources (
        meal_id TEXT PRIMARY KEY NOT NULL REFERENCES meals (id) ON DELETE CASCADE,
        input_kind TEXT NOT NULL CHECK (input_kind IN ('text', 'photo')),
        meal_title TEXT NOT NULL CHECK (length(meal_title) BETWEEN 1 AND 80),
        item_name TEXT NOT NULL CHECK (length(item_name) BETWEEN 1 AND 80),
        amount REAL NOT NULL CHECK (typeof(amount) IN ('integer', 'real') AND amount > 0),
        unit TEXT NOT NULL CHECK (unit IN ('g', 'ml', 'serving', 'piece', 'cup', 'tbsp', 'tsp')),
        matched_food_id TEXT REFERENCES foods (id) ON DELETE SET NULL,
        log_group_id TEXT NOT NULL CHECK (length(log_group_id) > 0),
        logged_at TEXT NOT NULL
      )`,
      'CREATE INDEX idx_meal_entry_ai_sources_group ON meal_entry_ai_sources (log_group_id)',
      'CREATE INDEX idx_meal_entry_ai_sources_food ON meal_entry_ai_sources (matched_food_id)',
    ],
  },
  {
    version: 5,
    name: 'create_barcode_product_tables',
    statements: [
      `CREATE TABLE online_product_cache (
        provider TEXT NOT NULL CHECK (provider IN ('open_food_facts')),
        barcode TEXT NOT NULL CHECK (length(barcode) BETWEEN 8 AND 14 AND barcode NOT GLOB '*[^0-9]*'),
        status TEXT NOT NULL CHECK (status IN ('found', 'not_found')),
        payload_version INTEGER NOT NULL CHECK (typeof(payload_version) = 'integer' AND payload_version >= 1),
        payload_json TEXT CHECK (payload_json IS NULL OR json_valid(payload_json)),
        fetched_at TEXT NOT NULL,
        stale_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        provider_modified_at TEXT,
        PRIMARY KEY (provider, barcode),
        CHECK ((status = 'found' AND payload_json IS NOT NULL) OR (status = 'not_found' AND payload_json IS NULL)),
        CHECK (stale_at <= expires_at)
      )`,
      'CREATE INDEX idx_online_product_cache_fetched ON online_product_cache (fetched_at, provider, barcode)',
      'CREATE INDEX idx_online_product_cache_expires ON online_product_cache (expires_at)',
      `CREATE TABLE food_barcodes (
        barcode TEXT PRIMARY KEY NOT NULL CHECK (length(barcode) BETWEEN 8 AND 14 AND barcode NOT GLOB '*[^0-9]*'),
        food_id TEXT NOT NULL REFERENCES foods (id) ON DELETE CASCADE,
        linked_at TEXT NOT NULL
      )`,
      'CREATE INDEX idx_food_barcodes_food ON food_barcodes (food_id)',
      `CREATE TABLE meal_entry_product_sources (
        meal_id TEXT PRIMARY KEY NOT NULL REFERENCES meals (id) ON DELETE CASCADE,
        provider TEXT NOT NULL CHECK (provider IN ('open_food_facts')),
        barcode TEXT NOT NULL CHECK (length(barcode) BETWEEN 8 AND 14 AND barcode NOT GLOB '*[^0-9]*'),
        provider_product_name TEXT CHECK (provider_product_name IS NULL OR length(provider_product_name) BETWEEN 1 AND 200),
        item_name TEXT NOT NULL CHECK (length(item_name) BETWEEN 1 AND 80),
        basis_amount REAL NOT NULL CHECK (typeof(basis_amount) IN ('integer', 'real') AND basis_amount > 0),
        basis_unit TEXT NOT NULL CHECK (basis_unit IN ('g', 'ml', 'serving')),
        base_calories REAL NOT NULL CHECK (typeof(base_calories) IN ('integer', 'real') AND base_calories >= 0),
        base_protein REAL NOT NULL CHECK (typeof(base_protein) IN ('integer', 'real') AND base_protein >= 0),
        base_carbs REAL NOT NULL CHECK (typeof(base_carbs) IN ('integer', 'real') AND base_carbs >= 0),
        base_fat REAL NOT NULL CHECK (typeof(base_fat) IN ('integer', 'real') AND base_fat >= 0),
        amount REAL NOT NULL CHECK (typeof(amount) IN ('integer', 'real') AND amount > 0),
        user_reviewed INTEGER NOT NULL CHECK (user_reviewed IN (0, 1)),
        looked_up_at TEXT NOT NULL,
        provider_modified_at TEXT,
        food_id TEXT REFERENCES foods (id) ON DELETE SET NULL,
        log_group_id TEXT CHECK (log_group_id IS NULL OR length(log_group_id) > 0),
        logged_at TEXT NOT NULL
      )`,
      'CREATE INDEX idx_meal_entry_product_sources_food ON meal_entry_product_sources (food_id)',
      'CREATE INDEX idx_meal_entry_product_sources_barcode ON meal_entry_product_sources (barcode)',
    ],
  },

  {
    version: 6,
    name: 'create_account_sync_tables',
    statements: SYNC_SCHEMA_STATEMENTS,
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
