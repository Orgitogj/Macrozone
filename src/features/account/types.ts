export type AccountScope = { kind: 'guest' } | { kind: 'account'; userId: string; accountKey: string };

export const GUEST_SCOPE: AccountScope = { kind: 'guest' };

export class AccountScopeChangedError extends Error {
  constructor() {
    super('The active MacroZone account changed while this operation was running.');
    this.name = 'AccountScopeChangedError';
  }
}

export function scopeKey(scope: AccountScope): string {
  return scope.kind === 'guest' ? 'guest' : `account:${scope.accountKey}`;
}

export function isSameScope(a: AccountScope, b: AccountScope): boolean {
  return scopeKey(a) === scopeKey(b);
}

export type LocalAccountDatabaseManager = {
  getActiveScope(): AccountScope;
  getEpoch(): number;
  getDatabase(): Promise<import('@/storage/database/types').SqlDatabase>;
  activate(scope: AccountScope): Promise<void>;
  closeActive(): Promise<void>;
  deleteAccountData(accountKey: string): Promise<void>;
  subscribe(listener: () => void): () => void;
};
