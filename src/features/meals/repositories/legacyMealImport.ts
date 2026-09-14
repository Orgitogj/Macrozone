import {
  areMealsEqual,
  extractExtraFieldsJson,
  INSERT_MEAL_SQL,
  MEAL_COLUMNS,
  mealToRowValues,
  rowToMeal,
  type MealRow,
} from '@/features/meals/repositories/mealRowMapping';
import type { Meal } from '@/features/meals/types';
import {
  isRecord,
  normalizeStoredMeal,
} from '@/features/meals/utils/mealRecords';
import type { SqlDatabase, SqlExecutor } from '@/storage/database/types';
import { fnv1aChecksum } from '@/utils/checksum';

export const LEGACY_MEALS_STORAGE_KEY = 'meals';
export const LEGACY_IMPORT_METADATA_KEY = 'legacy_async_storage_meals_import';

export type LegacyQuarantineReason = 'unreadable' | 'duplicate_id' | 'conflict' | 'unparseable_source';

export type LegacyImportCandidate = {
  sourceIndex: number;
  meal: Meal;
  extraJson: string | null;
  rawJson: string;
};

export type LegacyQuarantineEntry = {
  sourceIndex: number | null;
  rawJson: string;
  reason: LegacyQuarantineReason;
};

export type LegacyImportPlan = {
  sourceState: 'missing' | 'records' | 'unparseable';
  sourceRecordCount: number;
  sourceChecksum: string | null;
  candidates: LegacyImportCandidate[];
  quarantine: LegacyQuarantineEntry[];
};

export type LegacyImportResult =
  | { status: 'already_imported' }
  | {
      status: 'imported';
      sourceState: LegacyImportPlan['sourceState'];
      sourceRecordCount: number;
      importedCount: number;
      alreadyPresentCount: number;
      quarantinedCount: number;
    };

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? 'null';
  } catch {
    return String(value);
  }
}

export function planLegacyImport(rawValue: string | null): LegacyImportPlan {
  if (rawValue === null) {
    return {
      sourceState: 'missing',
      sourceRecordCount: 0,
      sourceChecksum: null,
      candidates: [],
      quarantine: [],
    };
  }

  const sourceChecksum = fnv1aChecksum(rawValue);
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    parsed = undefined;
  }

  if (!Array.isArray(parsed)) {
    return {
      sourceState: 'unparseable',
      sourceRecordCount: 0,
      sourceChecksum,
      candidates: [],
      quarantine: [{ sourceIndex: null, rawJson: rawValue, reason: 'unparseable_source' }],
    };
  }

  const candidates: LegacyImportCandidate[] = [];
  const quarantine: LegacyQuarantineEntry[] = [];
  const seenIds = new Set<string>();

  parsed.forEach((record: unknown, sourceIndex) => {
    const rawJson = safeStringify(record);
    const meal = normalizeStoredMeal(record);
    if (meal === null || !isRecord(record)) {
      quarantine.push({ sourceIndex, rawJson, reason: 'unreadable' });
      return;
    }
    if (seenIds.has(meal.id)) {
      quarantine.push({ sourceIndex, rawJson, reason: 'duplicate_id' });
      return;
    }
    seenIds.add(meal.id);
    candidates.push({ sourceIndex, meal, extraJson: extractExtraFieldsJson(record), rawJson });
  });

  return {
    sourceState: 'records',
    sourceRecordCount: parsed.length,
    sourceChecksum,
    candidates,
    quarantine,
  };
}

async function isImportRecorded(executor: SqlExecutor): Promise<boolean> {
  const row = await executor.getFirstAsync<{ key: string }>(
    'SELECT key FROM app_metadata WHERE key = ?',
    [LEGACY_IMPORT_METADATA_KEY],
  );
  return row !== null;
}

async function insertQuarantine(
  executor: SqlExecutor,
  entry: LegacyQuarantineEntry,
  importedAt: string,
): Promise<void> {
  await executor.runAsync(
    'INSERT INTO legacy_meal_records (source_index, raw_json, reason, imported_at) VALUES (?, ?, ?, ?)',
    [entry.sourceIndex, entry.rawJson, entry.reason, importedAt],
  );
}

export async function importLegacyMeals(
  database: SqlDatabase,
  {
    readLegacyValue,
    now = () => new Date(),
  }: { readLegacyValue: () => Promise<string | null>; now?: () => Date },
): Promise<LegacyImportResult> {
  if (await isImportRecorded(database)) {
    return { status: 'already_imported' };
  }

  const plan = planLegacyImport(await readLegacyValue());
  const importedAt = now().toISOString();
  let result: LegacyImportResult = { status: 'already_imported' };

  await database.withExclusiveTransactionAsync(async (transaction) => {
    if (await isImportRecorded(transaction)) {
      return;
    }

    let importedCount = 0;
    let alreadyPresentCount = 0;
    const quarantine = [...plan.quarantine];

    for (const candidate of plan.candidates) {
      const insert = await transaction.runAsync(
        `${INSERT_MEAL_SQL} ON CONFLICT(id) DO NOTHING`,
        mealToRowValues(candidate.meal, candidate.extraJson),
      );
      if (insert.changes > 0) {
        importedCount += 1;
        continue;
      }
      const existingRow = await transaction.getFirstAsync<MealRow>(
        `SELECT ${MEAL_COLUMNS} FROM meals WHERE id = ?`,
        [candidate.meal.id],
      );
      const existing = existingRow ? rowToMeal(existingRow) : null;
      if (existing !== null && areMealsEqual(existing, candidate.meal)) {
        alreadyPresentCount += 1;
      } else {
        quarantine.push({ sourceIndex: candidate.sourceIndex, rawJson: candidate.rawJson, reason: 'conflict' });
      }
    }

    for (const entry of quarantine) {
      await insertQuarantine(transaction, entry, importedAt);
    }

    const summary = {
      sourceState: plan.sourceState,
      sourceRecordCount: plan.sourceRecordCount,
      sourceChecksum: plan.sourceChecksum,
      importedCount,
      alreadyPresentCount,
      quarantinedCount: quarantine.length,
      completedAt: importedAt,
    };

    await transaction.runAsync(
      'INSERT INTO app_metadata (key, value, updated_at) VALUES (?, ?, ?)',
      [LEGACY_IMPORT_METADATA_KEY, JSON.stringify(summary), importedAt],
    );

    result = {
      status: 'imported',
      sourceState: plan.sourceState,
      sourceRecordCount: plan.sourceRecordCount,
      importedCount,
      alreadyPresentCount,
      quarantinedCount: quarantine.length,
    };
  });

  return result;
}
