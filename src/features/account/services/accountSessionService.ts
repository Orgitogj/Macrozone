import type { AuthService } from '@/features/auth/services/authService';
import type { AuthSession } from '@/features/auth/types';
import type { GuestImportService } from '@/features/account/services/guestImportService';
import type { AccountScopeStore } from '@/features/account/services/accountScopeStore';
import { GUEST_SCOPE, type AccountScope, type LocalAccountDatabaseManager } from '@/features/account/types';
import { deriveAccountKey } from '@/features/account/utils/accountKey';
import type { SyncCoordinator } from '@/features/sync/services/syncCoordinator';
import type { SyncTriggers } from '@/features/sync/services/syncTriggers';

export type ActiveAccountRecord = { userId: string; accountKey: string };

export type AccountSessionState = {
  status: 'restoring' | 'guest' | 'signed_in';
  scope: AccountScope;
  email: string | null;
  emailVerified: boolean;
};

export type AccountSessionStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export const ACTIVE_ACCOUNT_KEY = 'macrozone.activeAccount';

export function createAccountSessionService({
  auth,
  scopeStore,
  databaseManager,
  metadataStore,
  createCoordinator,
  createTriggers,
  guestImport,
  deriveKey = deriveAccountKey,
  onStateChange,
}: {
  auth: AuthService;
  scopeStore: AccountScopeStore;
  databaseManager: LocalAccountDatabaseManager;
  metadataStore: AccountSessionStore;
  createCoordinator: (scope: AccountScope) => SyncCoordinator | null;
  createTriggers: (coordinator: SyncCoordinator) => SyncTriggers;
  guestImport?: GuestImportService;
  deriveKey?: (userId: string) => Promise<string>;
  onStateChange?: (state: AccountSessionState) => void;
}) {
  let state: AccountSessionState = { status: 'restoring', scope: GUEST_SCOPE, email: null, emailVerified: false };
  let coordinator: SyncCoordinator | null = null;
  let triggers: SyncTriggers | null = null;

  const setState = (next: Partial<AccountSessionState>) => {
    state = { ...state, ...next };
    onStateChange?.(state);
  };

  const stopSync = () => {
    triggers?.stop();
    coordinator?.stop();
    triggers = null;
    coordinator = null;
  };

  const startSync = (scope: AccountScope) => {
    if (scope.kind !== 'account') {
      return;
    }
    coordinator = createCoordinator(scope);
    if (coordinator === null) {
      return;
    }
    triggers = createTriggers(coordinator);
    triggers.start();
  };

  const switchTo = async (scope: AccountScope, session: AuthSession | null): Promise<void> => {
    stopSync();
    await databaseManager.activate(scope);
    scopeStore.setScope(scope);
    setState({
      status: scope.kind === 'account' ? 'signed_in' : 'guest',
      scope,
      email: session?.user.email ?? null,
      emailVerified: session?.user.emailVerified ?? false,
    });
    startSync(scope);
  };

  const readActiveRecord = async (): Promise<ActiveAccountRecord | null> => {
    try {
      const raw = await metadataStore.getItem(ACTIVE_ACCOUNT_KEY);
      if (raw === null) {
        return null;
      }
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        return null;
      }
      const { userId, accountKey } = parsed as Partial<ActiveAccountRecord>;
      return typeof userId === 'string' && typeof accountKey === 'string' ? { userId, accountKey } : null;
    } catch {
      return null;
    }
  };

  return {
    getState: (): AccountSessionState => state,

    restore: async (): Promise<AccountSessionState> => {
      const record = await readActiveRecord();
      if (record === null) {
        await switchTo(GUEST_SCOPE, null);
        return state;
      }
      await switchTo({ kind: 'account', userId: record.userId, accountKey: record.accountKey }, null);
      const session = await auth.getSession();
      if (session !== null && session.user.id === record.userId) {
        setState({ email: session.user.email, emailVerified: session.user.emailVerified });
      }
      void coordinator?.requestSync('sign_in');
      return state;
    },

    signInWithSession: async (session: AuthSession): Promise<AccountSessionState> => {
      const accountKey = await deriveKey(session.user.id);
      await metadataStore.setItem(ACTIVE_ACCOUNT_KEY, JSON.stringify({ userId: session.user.id, accountKey }));
      await switchTo({ kind: 'account', userId: session.user.id, accountKey }, session);
      void coordinator?.requestSync('sign_in');
      return state;
    },

    signOut: async (): Promise<AccountSessionState> => {
      stopSync();
      await auth.signOut();
      await metadataStore.removeItem(ACTIVE_ACCOUNT_KEY);
      await switchTo(GUEST_SCOPE, null);
      return state;
    },

    switchToGuest: async (): Promise<AccountSessionState> => {
      stopSync();
      await switchTo(GUEST_SCOPE, null);
      return state;
    },

    forgetActiveAccount: async (): Promise<void> => {
      await metadataStore.removeItem(ACTIVE_ACCOUNT_KEY);
    },

    describeGuestData: () => guestImport?.describeGuestData() ?? null,

    importGuestData: async () => {
      const summary = await guestImport?.importGuestData();
      if (summary !== undefined) {
        void coordinator?.requestSync('guest_import');
      }
      return summary ?? null;
    },

    getCoordinator: (): SyncCoordinator | null => coordinator,

    stopSync,
  };
}

export type AccountSessionService = ReturnType<typeof createAccountSessionService>;
