import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { KeyValueRow } from '@/components/ui/KeyValueRow';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextButton } from '@/components/ui/TextButton';
import { SyncStatusCard } from '@/features/account/components/SyncStatusCard';
import { useAccountNavigation } from '@/features/account/hooks/useAccountNavigation';
import { useAccountSession } from '@/features/account/hooks/useAccountSession';
import { useGuestImport } from '@/features/account/hooks/useGuestImport';
import { useSyncStatus } from '@/features/account/hooks/useSyncStatus';
import { getAccountServices } from '@/features/account/services/getAccountServices';
import { totalGuestItems } from '@/features/account/utils/guestCounts';
import { spacing } from '@/theme';

export function AccountScreen() {
  const services = getAccountServices();
  const state = useAccountSession();
  const sync = useSyncStatus();
  const navigation = useAccountNavigation();
  const signedIn = state.status === 'signed_in';
  const guestData = useGuestImport(signedIn);
  const [signOutMessage, setSignOutMessage] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const running = useRef(false);

  const signOut = useCallback(() => {
    if (running.current) {
      return;
    }
    running.current = true;
    setSigningOut(true);
    setSignOutMessage(null);
    void (async () => {
      try {
        const outcome = await services.signOut();
        setSignOutMessage(outcome.status === 'ok' ? null : outcome.message);
      } finally {
        running.current = false;
        setSigningOut(false);
      }
    })();
  }, [services]);

  const description = guestData.resource.status === 'ready' ? guestData.resource.data : null;
  const pendingGuestData =
    description !== null &&
    totalGuestItems(description.counts) > 0 &&
    (description.decision === null || description.decision === 'deferred' || description.decision === 'in_progress');

  if (!signedIn) {
    return (
      <ScrollScreen edges={['bottom']}>
        <View style={styles.content}>
          <AppCard style={styles.card}>
            <AppText variant='subheading'>Using MacroZone locally</AppText>
            <AppText variant='body' tone='secondary'>
              Everything you log is saved on this device. An account is optional: it backs up your data and keeps other
              devices in sync.
            </AppText>
          </AppCard>

          {!state.configured ? (
            <NoticeCard
              title='Cloud backup is not set up'
              message={state.configurationNotice ?? 'MacroZone works on this device without an account.'}
            />
          ) : null}

          {signOutMessage !== null ? <NoticeCard tone='warning' message={signOutMessage} /> : null}

          <View style={styles.actions}>
            <AppButton
              label='Sign In'
              onPress={navigation.openSignIn}
              disabled={!state.configured}
              accessibilityHint='Signs in to an existing MacroZone account'
            />
            <AppButton
              label='Create Account'
              variant='secondary'
              onPress={navigation.openSignUp}
              disabled={!state.configured}
              accessibilityHint='Creates a new MacroZone account for cloud backup'
            />
          </View>

          <AppText variant='caption' tone='secondary'>
            Optional cloud backup. You can keep using MacroZone without an account for as long as you like.
          </AppText>
        </View>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        <AppCard style={styles.card}>
          <SectionHeader title='Your account' />
          <KeyValueRow label='Email' value={state.email ?? 'Not available'} />
          <KeyValueRow label='Email confirmed' value={state.emailVerified ? 'Yes' : 'Not yet'} />
          {!state.emailVerified ? (
            <NoticeCard
              tone='warning'
              message='Confirm your email address to keep cloud backup working. Your data keeps syncing to this device either way.'
            >
              <TextButton
                label='Resend confirmation email'
                size='small'
                onPress={() => navigation.openVerifyEmail(state.email ?? '')}
              />
            </NoticeCard>
          ) : null}
        </AppCard>

        <SyncStatusCard sync={sync} onManageConflicts={navigation.openConflicts} />

        {pendingGuestData ? (
          <AppCard style={styles.card}>
            <SectionHeader title='Data already on this device' />
            <AppText variant='body' tone='secondary'>
              MacroZone found {totalGuestItems(description.counts)} items saved on this device before you signed in. You
              choose what happens to them.
            </AppText>
            <AppButton label='Review This Device Data' variant='secondary' onPress={navigation.openGuestImport} />
          </AppCard>
        ) : null}

        {signOutMessage !== null ? <NoticeCard tone='warning' message={signOutMessage} /> : null}

        <View style={styles.actions}>
          <AppButton
            label='Sign Out'
            variant='secondary'
            onPress={signOut}
            loading={signingOut}
            disabled={signingOut}
            accessibilityHint='Signs out and returns to the data stored on this device'
          />
          <TextButton label='Delete Account' tone='danger' onPress={navigation.openDeleteAccount} />
        </View>

        <AppText variant='caption' tone='secondary'>
          Signing out keeps your account data on this device until you delete it, and never touches the data you logged
          before signing in.
        </AppText>
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  card: {
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
});
