import type { Food, Recipe, SavedMeal } from '@/features/library/types';
import type { Meal, MealEntrySource } from '@/features/meals/types';
import type { NutritionPlan } from '@/features/nutrition-goals/types';
import type { SyncEntityType } from '@/storage/database/syncSchema';

export type { SyncEntityType };

export type BarcodeLink = {
  barcode: string;
  linkedAt: string;
};

export type SyncAggregate =
  | { type: 'meal'; id: string; meal: Meal; source: MealEntrySource | null }
  | { type: 'food'; id: string; food: Food; barcodes: BarcodeLink[] }
  | { type: 'saved_meal'; id: string; savedMeal: SavedMeal }
  | { type: 'recipe'; id: string; recipe: Recipe }
  | { type: 'nutrition_plan'; id: string; plan: NutritionPlan };

export type SyncOperationKind = 'upsert' | 'delete';

export type SyncOperation = {
  operationId: string;
  entityType: SyncEntityType;
  entityId: string;
  kind: SyncOperationKind;
  payloadVersion: number;
  baseRevision: number;
  payload: Record<string, unknown> | null;
};

export type SyncPushResult =
  | { operationId: string; status: 'applied'; revision: number }
  | { operationId: string; status: 'conflict'; revision: number; deleted: boolean; payload: Record<string, unknown> | null }
  | { operationId: string; status: 'rejected'; errorCode: string };

export type SyncChange = {
  entityType: SyncEntityType;
  entityId: string;
  revision: number;
  changeSeq: number;
  payloadVersion: number;
  deleted: boolean;
  payload: Record<string, unknown> | null;
};

export type SyncPullPage = {
  changes: SyncChange[];
  nextCursor: number;
  hasMore: boolean;
};

export type SyncErrorCode =
  | 'not_configured'
  | 'offline'
  | 'service_unavailable'
  | 'auth_expired'
  | 'rate_limited'
  | 'validation_failed'
  | 'unsupported_payload'
  | 'cursor_expired'
  | 'unexpected_response'
  | 'local_storage_failed'
  | 'scope_changed'
  | 'cancelled';

export class SyncError extends Error {
  readonly code: SyncErrorCode;
  readonly retryAfterMs: number | null;

  constructor(code: SyncErrorCode, message: string, options?: { cause?: unknown; retryAfterMs?: number | null }) {
    super(message, options);
    this.name = 'SyncError';
    this.code = code;
    this.retryAfterMs = options?.retryAfterMs ?? null;
  }
}

export type CloudSyncRepository = {
  push(operations: readonly SyncOperation[], options?: { signal?: AbortSignal }): Promise<SyncPushResult[]>;
  pull(afterCursor: number, limit: number, options?: { signal?: AbortSignal }): Promise<SyncPullPage>;
};

export type SyncConflictReason = 'concurrent_edit' | 'delete_vs_edit' | 'duplicate_food' | 'invalid_payload';

export type SyncConflictResolution = 'keep_mine' | 'use_cloud' | 'duplicate';

export type SyncConflict = {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  reason: SyncConflictReason;
  localPayload: Record<string, unknown> | null;
  localDeleted: boolean;
  cloudRevision: number;
  cloudPayload: Record<string, unknown> | null;
  cloudDeleted: boolean;
  detectedAt: string;
};

export type SyncPendingSummary = {
  pendingCount: number;
  conflictCount: number;
  lastSuccessAt: string | null;
  lastErrorCode: string | null;
  blockedReason: string | null;
  cursor: number;
};

export type SealedOperation = SyncOperation & { seq: number; attemptCount: number };

export type AcknowledgementOutcome = {
  applied: number;
  conflicts: number;
  rejected: number;
};

export type PullApplyOutcome = {
  applied: number;
  conflicts: number;
  skipped: number;
};

export type LocalSyncStore = {
  readonly accountKey: string;
  sealOperations(options: { limit: number; now: Date }): Promise<SealedOperation[]>;
  acknowledge(results: readonly SyncPushResult[], options: { now: Date }): Promise<AcknowledgementOutcome>;
  recordTransientFailure(
    operations: readonly SealedOperation[],
    options: { code: string; now: Date; delayMs: (attempt: number) => number },
  ): Promise<void>;
  getCursor(): Promise<number>;
  applyPullPage(page: SyncPullPage, options: { now: Date }): Promise<PullApplyOutcome>;
  summarize(): Promise<SyncPendingSummary>;
  listConflicts(): Promise<SyncConflict[]>;
  resolveConflict(conflictId: string, resolution: SyncConflictResolution, options: { now: Date }): Promise<void>;
  recordRunResult(options: { now: Date; errorCode: string | null; blockedReason: string | null }): Promise<void>;
};
