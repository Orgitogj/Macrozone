import { StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { KeyValueRow } from '@/components/ui/KeyValueRow';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextButton } from '@/components/ui/TextButton';
import { useAccountNavigation } from '@/features/account/hooks/useAccountNavigation';
import { useAccountSession } from '@/features/account/hooks/useAccountSession';
import { useGuestImport } from '@/features/account/hooks/useGuestImport';
import { guestCountRows, IMPORT_STAGE_LABELS, totalGuestItems } from '@/features/account/utils/guestCounts';
import { spacing, useTheme } from '@/theme';

export function GuestImportScreen() {
  const state = useAccountSession();
  const navigation = useAccountNavigation();
  const signedIn = state.status === 'signed_in';
  const guestData = useGuestImport(signedIn);
  const { colors } = useTheme();

  if (!signedIn) {
    return (
      <ScrollScreen edges={['bottom']}>
        <View style={styles.content}>
          <NoticeCard
            title='Sign in first'
            message='Choosing what happens to the data on this device needs an account to copy it into.'
          />
          <AppButton label='Sign In' onPress={navigation.openSignIn} />
        </View>
      </ScrollScreen>
    );
  }

  if (guestData.resource.status === 'loading') {
    return (
      <ScrollScreen edges={['bottom']}>
        <AppLoader accessibilityLabel='Checking the data saved on this device' />
      </ScrollScreen>
    );
  }

  if (guestData.resource.status === 'error') {
    return (
      <ScrollScreen edges={['bottom']}>
        <ErrorState message={guestData.resource.message} onRetry={guestData.retry} />
      </ScrollScreen>
    );
  }

  const description = guestData.resource.data;
  if (description === null || totalGuestItems(description.counts) === 0) {
    return (
      <ScrollScreen edges={['bottom']}>
        <EmptyState
          title='Nothing to copy'
          message='There is no data from before you signed in on this device.'
          action={<AppButton label='Back to Account & Sync' variant='secondary' onPress={navigation.replaceWithAccount} />}
        />
      </ScrollScreen>
    );
  }

  const rows = guestCountRows(description.counts).filter((row) => row.count > 0);
  const total = totalGuestItems(description.counts);
  const progress = guestData.progress;
  const importing = guestData.phase === 'importing';
  const imported = guestData.phase === 'imported' && guestData.summary !== null;

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        <AppCard style={styles.card}>
          <SectionHeader title='Data saved on this device' detail={`${total} items in total`} />
          {rows.map((row) => (
            <KeyValueRow key={row.key} label={row.label} value={`${row.count}`} />
          ))}
        </AppCard>

        <View style={styles.points}>
          <AppText variant='body' tone='secondary'>
            • A copy of these items is added to the account you are signed in to and backed up.
          </AppText>
          <AppText variant='body' tone='secondary'>
            • The original data stays on this device, exactly as it is. Nothing here is deleted.
          </AppText>
          <AppText variant='body' tone='secondary'>
            • If copying is interrupted, running it again continues and does not create duplicates.
          </AppText>
          <AppText variant='body' tone='secondary'>
            • If your account already has different versions of the same items, you may be asked to review them.
          </AppText>
        </View>

        {description.decision === 'declined' ? (
          <NoticeCard message='You chose to keep this device data separate. You can still back it up later.' />
        ) : null}

        {description.decision === 'in_progress' && !importing ? (
          <NoticeCard
            tone='warning'
            message='A previous copy of this device data did not finish. Running it again continues where it stopped without duplicating anything.'
          />
        ) : null}

        {guestData.errorMessage !== null ? <NoticeCard tone='danger' message={guestData.errorMessage} /> : null}

        {importing ? (
          <AppCard style={styles.card}>
            <AppText variant='subheading'>Copying your data into your account…</AppText>
            <AppText variant='body' tone='secondary'>
              {progress === null
                ? 'Getting started…'
                : `${IMPORT_STAGE_LABELS[progress.entityType]}: ${progress.completed} of ${progress.total}`}
            </AppText>
            <ProgressBar
              fraction={progress === null || progress.total === 0 ? 0 : progress.completed / progress.total}
              color={colors.primary}
              accessibilityLabel={
                progress === null
                  ? 'Copy starting'
                  : `Copying ${IMPORT_STAGE_LABELS[progress.entityType]}, ${progress.completed} of ${progress.total}`
              }
            />
          </AppCard>
        ) : null}

        {imported && guestData.summary !== null ? (
          <AppCard style={styles.card}>
            <SectionHeader title='Copied to your account' />
            <KeyValueRow label='Copies added' value={`${totalGuestItems(guestData.summary.imported)}`} />
            <KeyValueRow label='Already in your account' value={`${totalGuestItems(guestData.summary.alreadyPresent)}`} />
            <AppText variant='caption' tone='secondary'>
              Your account may also hold changes from other devices. If two devices changed the same item, MacroZone asks
              you to choose on the Account &amp; sync screen.
            </AppText>
          </AppCard>
        ) : null}

        <View style={styles.actions}>
          <AppButton
            label={guestData.phase === 'failed' ? 'Try Copying Again' : 'Copy and Back Up in My Account'}
            onPress={guestData.startImport}
            loading={importing}
            disabled={guestData.busy || imported}
            accessibilityHint='Adds a copy of this device data to your account and keeps the original on this device'
          />
          <AppButton
            label='Keep Guest Data Separate'
            variant='secondary'
            onPress={guestData.keepSeparate}
            disabled={guestData.busy}
            accessibilityHint='Leaves this device data where it is and does not copy it into your account'
          />
          <TextButton label='Decide Later' onPress={guestData.decideLater} disabled={guestData.busy} />
          <TextButton label='Back to Account & Sync' tone='secondary' onPress={navigation.replaceWithAccount} />
        </View>
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
  points: {
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
  },
});
