import type { SyncErrorCode, SyncPendingSummary } from '@/features/sync/types';
import type { SyncPhase } from '@/features/sync/services/syncCoordinator';

export const SYNC_ERROR_MESSAGES: Readonly<Record<SyncErrorCode, string>> = {
  not_configured: 'Cloud backup is not set up in this version of MacroZone.',
  offline: 'The last sync could not reach the cloud. Your changes are safe on this device.',
  service_unavailable: 'Cloud sync is unavailable right now. MacroZone will try again automatically.',
  auth_expired: 'Sign in again to keep syncing this account.',
  rate_limited: 'MacroZone synced too often and is waiting before trying again.',
  validation_failed: 'Some changes were refused by the cloud. They stay on this device.',
  unsupported_payload: 'Some cloud data needs a newer version of MacroZone. Everything else keeps syncing.',
  cursor_expired: 'This device has been offline for a long time and needs a fresh copy of your account.',
  unexpected_response: 'The cloud returned something MacroZone could not read. It will try again.',
  local_storage_failed: 'MacroZone could not update the sync data stored on this device.',
  scope_changed: 'The active account changed while syncing. MacroZone will sync again shortly.',
  cancelled: 'The last sync was cancelled.',
};

export function describeSyncError(code: string | null): string | null {
  if (code === null) {
    return null;
  }
  return SYNC_ERROR_MESSAGES[code as SyncErrorCode] ?? 'The last sync did not finish. MacroZone will try again.';
}

export type SyncStatusKind =
  | 'not_configured'
  | 'local_only'
  | 'up_to_date'
  | 'changes_waiting'
  | 'syncing'
  | 'offline'
  | 'attention_required'
  | 'sign_in_required';

export type SyncStatus = {
  kind: SyncStatusKind;
  label: string;
  detail: string;
};

export const SYNC_STATUS_LABELS: Readonly<Record<SyncStatusKind, string>> = {
  not_configured: 'Cloud backup is not configured',
  local_only: 'Local only',
  up_to_date: 'Up to date',
  changes_waiting: 'Changes waiting',
  syncing: 'Syncing',
  offline: 'Offline',
  attention_required: 'Attention required',
  sign_in_required: 'Sign in again',
};

function pluralize(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

export function deriveSyncStatus({
  configured,
  signedIn,
  phase,
  online,
  summary,
}: {
  configured: boolean;
  signedIn: boolean;
  phase: SyncPhase;
  online: boolean;
  summary: SyncPendingSummary | null;
}): SyncStatus {
  if (!configured) {
    return {
      kind: 'not_configured',
      label: SYNC_STATUS_LABELS.not_configured,
      detail: 'MacroZone works on this device. Cloud backup is not set up in this version.',
    };
  }
  if (!signedIn) {
    return {
      kind: 'local_only',
      label: SYNC_STATUS_LABELS.local_only,
      detail: 'Your data stays on this device. Create an account to back it up and sync it.',
    };
  }
  const pending = summary?.pendingCount ?? 0;
  const conflicts = summary?.conflictCount ?? 0;
  if (summary?.lastErrorCode === 'auth_expired') {
    return { kind: 'sign_in_required', label: SYNC_STATUS_LABELS.sign_in_required, detail: 'Sign in again to keep syncing this account.' };
  }
  if (conflicts > 0 || summary?.blockedReason !== null) {
    return {
      kind: 'attention_required',
      label: SYNC_STATUS_LABELS.attention_required,
      detail:
        conflicts > 0
          ? `${pluralize(conflicts, 'change')} need${conflicts === 1 ? 's' : ''} your decision before syncing continues.`
          : 'Some cloud data cannot be read by this version of MacroZone.',
    };
  }
  if (phase === 'syncing') {
    return { kind: 'syncing', label: SYNC_STATUS_LABELS.syncing, detail: 'Sending and receiving your changes.' };
  }
  if (!online) {
    return {
      kind: 'offline',
      label: SYNC_STATUS_LABELS.offline,
      detail: pending > 0 ? `${pluralize(pending, 'change')} will sync when you are back online.` : 'You are offline. Everything still works on this device.',
    };
  }
  if (pending > 0) {
    return { kind: 'changes_waiting', label: SYNC_STATUS_LABELS.changes_waiting, detail: `${pluralize(pending, 'change')} waiting to sync.` };
  }
  return {
    kind: 'up_to_date',
    label: SYNC_STATUS_LABELS.up_to_date,
    detail: summary?.lastSuccessAt === null || summary === null ? 'Ready to sync.' : 'Everything on this device is backed up.',
  };
}

export function describeLastSync(lastSuccessAt: string | null, now: Date): string {
  if (lastSuccessAt === null) {
    return 'Not synced yet';
  }
  const elapsed = now.getTime() - Date.parse(lastSuccessAt);
  if (!Number.isFinite(elapsed) || elapsed < 0) {
    return 'Last synced just now';
  }
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) {
    return 'Last synced just now';
  }
  if (minutes < 60) {
    return `Last synced ${pluralize(minutes, 'minute')} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Last synced ${pluralize(hours, 'hour')} ago`;
  }
  return `Last synced ${pluralize(Math.floor(hours / 24), 'day')} ago`;
}
