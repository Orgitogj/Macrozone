import type { AccountScopeStore } from '@/features/account/services/accountScopeStore';
import {
  createAccountSessionService,
  type AccountSessionState,
  type AccountSessionStore,
} from '@/features/account/services/accountSessionService';
import type {
  GuestDataCounts,
  GuestImportDecision,
  GuestImportOptions,
  GuestImportProgress,
  GuestImportSummary,
} from '@/features/account/services/guestImportService';
import {
  AccountCopyError,
  type AccountCopyStatus,
  type AccountCopySummary,
  type AccountToGuestCopyService,
} from '@/features/account/services/accountToGuestCopyService';
import {
  ACCOUNT_DELETION_MESSAGES,
  AccountDeletionError,
  type AccountDeletionGateway,
} from '@/features/account/repositories/supabaseAccountDeletionGateway';
import { scopeKey, type AccountScope, type LocalAccountDatabaseManager } from '@/features/account/types';
import type { AuthService } from '@/features/auth/services/authService';
import type { AuthErrorCode } from '@/features/auth/types';
import type { ConnectivityProvider } from '@/features/sync/adapters/connectivityProvider';
import {
  createSyncCoordinator,
  type SyncCoordinator,
  type SyncPhase,
  type SyncRunOutcome,
} from '@/features/sync/services/syncCoordinator';
import {
  createSyncTriggers,
  type AppStateSource,
  type LocalChangeNotifier,
} from '@/features/sync/services/syncTriggers';
import {
  SyncError,
  type CloudSyncRepository,
  type LocalSyncStore,
  type SyncConflict,
  type SyncConflictResolution,
  type SyncPendingSummary,
} from '@/features/sync/types';

export type GuestImportPort = {
  describeGuestData(): Promise<{ datasetId: string; counts: GuestDataCounts; decision: GuestImportDecision | null }>;
  decline(datasetId: string): Promise<void>;
  decideLater(datasetId: string): Promise<void>;
  importGuestData(options?: GuestImportOptions): Promise<GuestImportSummary>;
};

export type AccountLinkState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'failed'; code: AuthErrorCode; message: string };

export type AccountUiState = {
  status: AccountSessionState['status'];
  scopeId: string;
  email: string | null;
  emailVerified: boolean;
  configured: boolean;
  configurationNotice: string | null;
  online: boolean;
  phase: SyncPhase;
  summary: SyncPendingSummary | null;
  lastOutcome: SyncRunOutcome | null;
  link: AccountLinkState;
};

export type SignOutOutcome = { status: 'ok' } | { status: 'partial'; message: string };

export type DeleteAccountMode = 'copy_to_guest' | 'remove';

export type DeleteAccountOutcome =
  | { status: 'deleted'; mode: DeleteAccountMode; copied: AccountCopySummary | null; accountDataRemoved: boolean }
  | { status: 'partial'; mode: DeleteAccountMode; copied: AccountCopySummary | null; accountDataRemoved: boolean; message: string }
  | { status: 'copied_not_deleted'; copied: AccountCopySummary; message: string }
  | { status: 'blocked'; message: string }
  | { status: 'failed'; message: string };

export type AuthLinkNavigation =
  | { status: 'none' }
  | { status: 'signed_in'; route: string }
  | { status: 'reset_password' }
  | { status: 'failed'; code: AuthErrorCode; message: string };

export function syncErrorMessage(error: unknown): string {
  return error instanceof SyncError ? error.message : 'Something went wrong. Please try again.';
}

export function createAccountServices({
  auth,
  configured,
  configurationNotice,
  scopeStore,
  databaseManager,
  metadataStore,
  createLocalStore,
  createCloud,
  connectivity,
  appState,
  localChanges,
  guestImport,
  accountCopy,
  accountDeletion,
  now = () => new Date(),
}: {
  auth: AuthService;
  configured: boolean;
  configurationNotice: string | null;
  scopeStore: AccountScopeStore;
  databaseManager: LocalAccountDatabaseManager;
  metadataStore: AccountSessionStore;
  createLocalStore: (scope: AccountScope) => LocalSyncStore | null;
  createCloud: () => CloudSyncRepository | null;
  connectivity: ConnectivityProvider;
  appState: AppStateSource;
  localChanges: LocalChangeNotifier;
  guestImport: GuestImportPort | null;
  accountCopy: AccountToGuestCopyService | null;
  accountDeletion: AccountDeletionGateway | null;
  now?: () => Date;
}) {
  const listeners = new Set<() => void>();
  let store: LocalSyncStore | null = null;
  let state: AccountUiState = {
    status: 'restoring',
    scopeId: scopeKey(scopeStore.getScope()),
    email: null,
    emailVerified: false,
    configured,
    configurationNotice,
    online: true,
    phase: 'idle',
    summary: null,
    lastOutcome: null,
    link: { status: 'idle' },
  };

  const notify = () => {
    for (const listener of [...listeners]) {
      listener();
    }
  };

  const setState = (patch: Partial<AccountUiState>) => {
    state = { ...state, ...patch };
    notify();
  };

  const refreshSummary = async (): Promise<void> => {
    const active = store;
    if (active === null) {
      setState({ summary: null });
      return;
    }
    try {
      const summary = await active.summarize();
      if (store === active) {
        setState({ summary });
      }
    } catch {
      return;
    }
  };

  const refreshOnline = async (): Promise<void> => {
    try {
      setState({ online: await connectivity.isOnline() });
    } catch {
      return;
    }
  };

  const buildCoordinator = (scope: AccountScope): SyncCoordinator | null => {
    const cloud = createCloud();
    const localStore = scope.kind === 'account' ? createLocalStore(scope) : null;
    if (cloud === null || localStore === null) {
      store = null;
      return null;
    }
    store = localStore;
    return createSyncCoordinator({
      store: localStore,
      cloud,
      connectivity,
      now,
      onStateChange: (coordinatorState) => {
        setState({ phase: coordinatorState.phase, lastOutcome: coordinatorState.lastOutcome });
        if (coordinatorState.phase === 'idle') {
          void refreshSummary();
          void refreshOnline();
        }
      },
    });
  };

  const session = createAccountSessionService({
    auth,
    scopeStore,
    databaseManager,
    metadataStore,
    createCoordinator: buildCoordinator,
    createTriggers: (coordinator) => createSyncTriggers({ coordinator, connectivity, appState, localChanges }),
    guestImport: guestImport ?? undefined,
    onStateChange: (next) => {
      if (next.status !== 'signed_in') {
        store = null;
      }
      setState({
        status: next.status,
        scopeId: scopeKey(next.scope),
        email: next.email,
        emailVerified: next.emailVerified,
        summary: next.status === 'signed_in' ? state.summary : null,
        lastOutcome: next.status === 'signed_in' ? state.lastOutcome : null,
      });
      void refreshSummary();
    },
  });

  const requireStore = (): LocalSyncStore => {
    if (store === null) {
      throw new SyncError('not_configured', 'Sign in to manage cloud backup.');
    }
    return store;
  };

  let deletionInFlight: Promise<DeleteAccountOutcome> | null = null;

  const runDeleteAccount = async ({
    password,
    mode,
    onCopyProgress,
  }: {
    password: string;
    mode: DeleteAccountMode;
    onCopyProgress?: (progress: GuestImportProgress) => void;
  }): Promise<DeleteAccountOutcome> => {
    const scope = scopeStore.getScope();
    if (scope.kind !== 'account') {
      return { status: 'failed', message: 'You are not signed in to a MacroZone account.' };
    }
    if (accountDeletion === null) {
      return { status: 'failed', message: ACCOUNT_DELETION_MESSAGES.not_configured };
    }
    session.stopSync();

    let copied: AccountCopySummary | null = null;
    if (mode === 'copy_to_guest') {
      if (accountCopy === null) {
        return {
          status: 'blocked',
          message: 'MacroZone cannot copy this account data to on-device data here, so nothing was deleted.',
        };
      }
      try {
        copied = await accountCopy.copyToGuest({ onProgress: onCopyProgress });
      } catch (error) {
        return {
          status: 'blocked',
          message: error instanceof AccountCopyError ? error.message : 'MacroZone could not copy your data, so nothing was deleted.',
        };
      }
      const activeScope = scopeStore.getScope();
      if (activeScope.kind !== 'account' || activeScope.accountKey !== scope.accountKey) {
        return { status: 'blocked', message: 'The signed-in account changed while copying, so nothing was deleted.' };
      }
    }

    try {
      await accountDeletion.deleteAccount({ password });
    } catch (error) {
      const message = error instanceof AccountDeletionError ? error.message : ACCOUNT_DELETION_MESSAGES.unexpected;
      return copied === null ? { status: 'failed', message } : { status: 'copied_not_deleted', copied, message };
    }

    const problems: string[] = [];
    const signedOut = await auth.signOut();
    if (signedOut.status === 'failed') {
      problems.push('Your cloud session could not be closed on this device.');
    }
    try {
      await session.forgetActiveAccount();
    } catch {
      problems.push('The saved account marker could not be cleared on this device.');
    }
    try {
      await session.switchToGuest();
    } catch {
      return {
        status: 'partial',
        mode,
        copied,
        accountDataRemoved: false,
        message: 'Your cloud account was deleted, but MacroZone could not switch back to on-device data. Close and reopen the app.',
      };
    }

    let accountDataRemoved = false;
    try {
      await databaseManager.deleteAccountData(scope.accountKey);
      accountDataRemoved = true;
    } catch {
      problems.push('The unusable account copy on this device could not be removed. It holds no cloud account any more.');
    }

    return problems.length === 0
      ? { status: 'deleted', mode, copied, accountDataRemoved }
      : { status: 'partial', mode, copied, accountDataRemoved, message: problems.join(' ') };
  };

  let linkInFlight: Promise<AuthLinkNavigation> | null = null;
  let subscribed = false;
  const handledLinks = new Set<string>();

  const runAuthLink = async (url: string): Promise<AuthLinkNavigation> => {
    setState({ link: { status: 'working' } });
    const outcome = await auth.handleAuthLink(url);
    if (outcome.status === 'ignored') {
      setState({ link: { status: 'idle' } });
      return { status: 'none' };
    }
    if (outcome.status === 'failed') {
      setState({ link: { status: 'failed', code: outcome.code, message: outcome.message } });
      return { status: 'failed', code: outcome.code, message: outcome.message };
    }
    await session.signInWithSession(outcome.session);
    await refreshSummary();
    setState({ link: { status: 'idle' } });
    return outcome.requiresNewPassword ? { status: 'reset_password' } : { status: 'signed_in', route: '/account' };
  };

  return {
    auth,

    session,

    guestImport,

    getState: (): AccountUiState => state,

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    initialize: async (): Promise<void> => {
      if (subscribed) {
        await session.restore();
        await refreshSummary();
        await refreshOnline();
        return;
      }
      subscribed = true;
      auth.subscribe((event, authSession) => {
        if (event === 'signed_out') {
          if (session.getState().status === 'signed_in') {
            void session.switchToGuest();
          }
          return;
        }
        if (authSession === null) {
          return;
        }
        const scope = scopeStore.getScope();
        if (scope.kind === 'account' && scope.userId === authSession.user.id) {
          setState({ email: authSession.user.email, emailVerified: authSession.user.emailVerified });
        }
      });
      connectivity.subscribe((online) => {
        setState({ online });
      });
      await session.restore();
      await refreshSummary();
      await refreshOnline();
    },

    refresh: async (): Promise<void> => {
      await refreshSummary();
      await refreshOnline();
    },

    syncNow: async (): Promise<SyncRunOutcome | null> => {
      const coordinator = session.getCoordinator();
      if (coordinator === null) {
        return null;
      }
      const outcome = await coordinator.requestSync('manual');
      await refreshSummary();
      return outcome;
    },

    importGuestData: async (
      onProgress?: (progress: GuestImportProgress) => void,
    ): Promise<GuestImportSummary | null> => {
      if (guestImport === null) {
        return null;
      }
      const summary = await guestImport.importGuestData({ onProgress });
      await refreshSummary();
      void session.getCoordinator()?.requestSync('guest_import');
      return summary;
    },

    listConflicts: (): Promise<SyncConflict[]> => requireStore().listConflicts(),

    resolveConflict: async (conflictId: string, resolution: SyncConflictResolution): Promise<void> => {
      await requireStore().resolveConflict(conflictId, resolution, { now: now() });
      await refreshSummary();
      void session.getCoordinator()?.requestSync('local_change');
    },

    signInWithPassword: async (input: { email: string; password: string }) => {
      const result = await auth.signIn(input);
      if (result.status === 'ok') {
        await session.signInWithSession(result.value);
        await refreshSummary();
      }
      return result;
    },

    signOut: async (): Promise<SignOutOutcome> => {
      session.stopSync();
      const problems: string[] = [];
      const signedOut = await auth.signOut();
      if (signedOut.status === 'failed') {
        problems.push('MacroZone could not close your cloud session. It will retry the next time you are online.');
      }
      try {
        await session.forgetActiveAccount();
      } catch {
        problems.push('MacroZone could not clear the saved account marker on this device.');
      }
      try {
        await session.switchToGuest();
      } catch {
        return {
          status: 'partial',
          message: 'MacroZone could not switch back to on-device data. Close and reopen the app.',
        };
      }
      return problems.length === 0 ? { status: 'ok' } : { status: 'partial', message: problems.join(' ') };
    },

    describeAccountCopy: async (): Promise<{ counts: GuestDataCounts; status: AccountCopyStatus | null } | null> => {
      if (accountCopy === null || scopeStore.getScope().kind !== 'account') {
        return null;
      }
      const described = await accountCopy.describeAccountData();
      return { counts: described.counts, status: described.status };
    },

    deleteAccount: (input: {
      password: string;
      mode: DeleteAccountMode;
      onCopyProgress?: (progress: GuestImportProgress) => void;
    }): Promise<DeleteAccountOutcome> => {
      if (deletionInFlight !== null) {
        return deletionInFlight;
      }
      const pending = runDeleteAccount(input).finally(() => {
        deletionInFlight = null;
      });
      deletionInFlight = pending;
      return pending;
    },

    handleAuthLink: (url: string): Promise<AuthLinkNavigation> => {
      if (linkInFlight !== null) {
        return linkInFlight;
      }
      if (handledLinks.has(url)) {
        return Promise.resolve({ status: 'none' });
      }
      handledLinks.add(url);
      const pending = runAuthLink(url).finally(() => {
        linkInFlight = null;
      });
      linkInFlight = pending;
      return pending;
    },

    clearLinkState: (): void => {
      setState({ link: { status: 'idle' } });
    },
  };
}

export type AccountServices = ReturnType<typeof createAccountServices>;
