export const SYNC_ENTITY_TYPES = ['meal', 'food', 'saved_meal', 'recipe', 'nutrition_plan'] as const;

export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];

export const NUTRITION_PLAN_ENTITY_ID = '00000000-0000-4000-8000-000000000001';

export const SYNC_PAYLOAD_VERSION = 1;

const NOW_EXPRESSION = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

const UUID_EXPRESSION = `lower(
      hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' ||
      substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))
    )`;

const ENTITY_TYPE_CHECK = `entity_type IN (${SYNC_ENTITY_TYPES.map((type) => `'${type}'`).join(', ')})`;

function enqueueStatement(entityType: SyncEntityType, idExpression: string, kind: 'upsert' | 'delete'): string {
  return `INSERT INTO sync_outbox (
      operation_id, entity_type, entity_id, operation_kind, payload_version, state, local_mutated_at, created_at
    )
    SELECT ${UUID_EXPRESSION}, '${entityType}', ${idExpression}, '${kind}', 1, 'pending', ${NOW_EXPRESSION}, ${NOW_EXPRESSION}
    FROM account_database_metadata AS metadata
    JOIN sync_state AS sync ON sync.id = 1
    WHERE metadata.id = 1 AND metadata.scope = 'account' AND sync.applying_remote = 0
    ON CONFLICT (entity_type, entity_id) WHERE state = 'pending'
    DO UPDATE SET operation_kind = excluded.operation_kind, local_mutated_at = excluded.local_mutated_at`;
}

type TriggerSource = {
  table: string;
  entityType: SyncEntityType;
  newIdExpression: string;
  oldIdExpression: string;
  deletesAggregate: boolean;
  condition?: string;
};

const PLAN_ID_EXPRESSION = `'${NUTRITION_PLAN_ENTITY_ID}'`;

const TRIGGER_SOURCES: readonly TriggerSource[] = [
  { table: 'meals', entityType: 'meal', newIdExpression: 'NEW.id', oldIdExpression: 'OLD.id', deletesAggregate: true },
  { table: 'meal_entry_sources', entityType: 'meal', newIdExpression: 'NEW.meal_id', oldIdExpression: 'OLD.meal_id', deletesAggregate: false },
  { table: 'meal_entry_ai_sources', entityType: 'meal', newIdExpression: 'NEW.meal_id', oldIdExpression: 'OLD.meal_id', deletesAggregate: false },
  { table: 'meal_entry_product_sources', entityType: 'meal', newIdExpression: 'NEW.meal_id', oldIdExpression: 'OLD.meal_id', deletesAggregate: false },
  { table: 'foods', entityType: 'food', newIdExpression: 'NEW.id', oldIdExpression: 'OLD.id', deletesAggregate: true },
  { table: 'food_barcodes', entityType: 'food', newIdExpression: 'NEW.food_id', oldIdExpression: 'OLD.food_id', deletesAggregate: false },
  { table: 'saved_meals', entityType: 'saved_meal', newIdExpression: 'NEW.id', oldIdExpression: 'OLD.id', deletesAggregate: true },
  { table: 'saved_meal_items', entityType: 'saved_meal', newIdExpression: 'NEW.saved_meal_id', oldIdExpression: 'OLD.saved_meal_id', deletesAggregate: false },
  { table: 'recipes', entityType: 'recipe', newIdExpression: 'NEW.id', oldIdExpression: 'OLD.id', deletesAggregate: true },
  { table: 'recipe_ingredients', entityType: 'recipe', newIdExpression: 'NEW.recipe_id', oldIdExpression: 'OLD.recipe_id', deletesAggregate: false },
  { table: 'user_profile', entityType: 'nutrition_plan', newIdExpression: PLAN_ID_EXPRESSION, oldIdExpression: PLAN_ID_EXPRESSION, deletesAggregate: false },
  { table: 'nutrition_goals', entityType: 'nutrition_plan', newIdExpression: PLAN_ID_EXPRESSION, oldIdExpression: PLAN_ID_EXPRESSION, deletesAggregate: false },
  {
    table: 'app_metadata',
    entityType: 'nutrition_plan',
    newIdExpression: PLAN_ID_EXPRESSION,
    oldIdExpression: PLAN_ID_EXPRESSION,
    deletesAggregate: false,
    condition: "key = 'onboarding'",
  },
];

function triggerStatements(source: TriggerSource): string[] {
  const events = [
    { event: 'INSERT', alias: 'NEW' },
    { event: 'UPDATE', alias: 'NEW' },
    { event: 'DELETE', alias: 'OLD' },
  ] as const;
  return events.map(({ event, alias }) => {
    const isDelete = event === 'DELETE';
    const idExpression = alias === 'NEW' ? source.newIdExpression : source.oldIdExpression;
    const kind = isDelete && source.deletesAggregate ? 'delete' : 'upsert';
    const condition = source.condition ? ` WHEN ${alias}.${source.condition}` : '';
    return `CREATE TRIGGER sync_outbox_${source.table}_${event.toLowerCase()}
    AFTER ${event} ON ${source.table}${condition}
    BEGIN
    ${enqueueStatement(source.entityType, idExpression, kind)};
    END`;
  });
}

export const SYNC_SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE account_database_metadata (
    id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
    scope TEXT NOT NULL CHECK (scope IN ('guest', 'account')),
    account_key TEXT CHECK (account_key IS NULL OR (length(account_key) BETWEEN 8 AND 64 AND account_key NOT GLOB '*[^0-9a-f]*')),
    guest_dataset_id TEXT CHECK (guest_dataset_id IS NULL OR length(guest_dataset_id) = 36),
    created_at TEXT NOT NULL,
    CHECK ((scope = 'guest' AND account_key IS NULL) OR (scope = 'account' AND account_key IS NOT NULL))
  )`,
  `INSERT INTO account_database_metadata (id, scope, account_key, guest_dataset_id, created_at)
   VALUES (1, 'guest', NULL, NULL, ${NOW_EXPRESSION})`,
  `CREATE TABLE sync_state (
    id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
    applying_remote INTEGER NOT NULL DEFAULT 0 CHECK (applying_remote IN (0, 1)),
    pull_cursor INTEGER NOT NULL DEFAULT 0 CHECK (typeof(pull_cursor) = 'integer' AND pull_cursor >= 0),
    last_attempt_at TEXT,
    last_success_at TEXT,
    last_error_code TEXT,
    blocked_reason TEXT
  )`,
  'INSERT INTO sync_state (id, applying_remote, pull_cursor) VALUES (1, 0, 0)',
  `CREATE TABLE sync_outbox (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id TEXT NOT NULL UNIQUE CHECK (length(operation_id) = 36),
    entity_type TEXT NOT NULL CHECK (${ENTITY_TYPE_CHECK}),
    entity_id TEXT NOT NULL CHECK (length(entity_id) > 0),
    operation_kind TEXT NOT NULL CHECK (operation_kind IN ('upsert', 'delete')),
    payload_version INTEGER NOT NULL CHECK (typeof(payload_version) = 'integer' AND payload_version >= 1),
    state TEXT NOT NULL CHECK (state IN ('pending', 'sealed', 'blocked')),
    base_revision INTEGER CHECK (base_revision IS NULL OR (typeof(base_revision) = 'integer' AND base_revision >= 0)),
    payload_json TEXT CHECK (payload_json IS NULL OR json_valid(payload_json)),
    local_mutated_at TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (typeof(attempt_count) = 'integer' AND attempt_count >= 0),
    next_attempt_at TEXT,
    last_error_code TEXT,
    created_at TEXT NOT NULL,
    CHECK (state <> 'sealed' OR base_revision IS NOT NULL)
  )`,
  "CREATE UNIQUE INDEX idx_sync_outbox_pending ON sync_outbox (entity_type, entity_id) WHERE state = 'pending'",
  'CREATE INDEX idx_sync_outbox_state ON sync_outbox (state, next_attempt_at, seq)',
  `CREATE TABLE sync_entity_revisions (
    entity_type TEXT NOT NULL CHECK (${ENTITY_TYPE_CHECK}),
    entity_id TEXT NOT NULL CHECK (length(entity_id) > 0),
    server_revision INTEGER NOT NULL CHECK (typeof(server_revision) = 'integer' AND server_revision >= 0),
    deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
    synced_hash TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (entity_type, entity_id)
  )`,
  `CREATE TABLE sync_conflicts (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 36),
    entity_type TEXT NOT NULL CHECK (${ENTITY_TYPE_CHECK}),
    entity_id TEXT NOT NULL CHECK (length(entity_id) > 0),
    reason TEXT NOT NULL CHECK (reason IN ('concurrent_edit', 'delete_vs_edit', 'duplicate_food', 'invalid_payload')),
    local_payload_json TEXT CHECK (local_payload_json IS NULL OR json_valid(local_payload_json)),
    local_deleted INTEGER NOT NULL CHECK (local_deleted IN (0, 1)),
    cloud_revision INTEGER NOT NULL CHECK (typeof(cloud_revision) = 'integer' AND cloud_revision >= 0),
    cloud_payload_json TEXT CHECK (cloud_payload_json IS NULL OR json_valid(cloud_payload_json)),
    cloud_deleted INTEGER NOT NULL CHECK (cloud_deleted IN (0, 1)),
    status TEXT NOT NULL CHECK (status IN ('open', 'resolved')),
    resolution TEXT CHECK (resolution IS NULL OR resolution IN ('keep_mine', 'use_cloud', 'duplicate')),
    detected_at TEXT NOT NULL,
    resolved_at TEXT
  )`,
  "CREATE UNIQUE INDEX idx_sync_conflicts_open ON sync_conflicts (entity_type, entity_id) WHERE status = 'open'",
  'CREATE INDEX idx_sync_conflicts_status ON sync_conflicts (status, detected_at)',
  `CREATE TABLE imported_guest_datasets (
    dataset_id TEXT PRIMARY KEY NOT NULL CHECK (length(dataset_id) = 36),
    status TEXT NOT NULL CHECK (status IN ('declined', 'deferred', 'in_progress', 'completed')),
    counts_json TEXT CHECK (counts_json IS NULL OR json_valid(counts_json)),
    started_at TEXT,
    completed_at TEXT,
    updated_at TEXT NOT NULL
  )`,
  ...TRIGGER_SOURCES.flatMap(triggerStatements),
];
