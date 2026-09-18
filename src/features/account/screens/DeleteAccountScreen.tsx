import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { ChoiceList } from '@/components/ui/ChoiceList';
import { FormField } from '@/components/ui/FormField';
import { KeyValueRow } from '@/components/ui/KeyValueRow';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextButton } from '@/components/ui/TextButton';
import { useAccountNavigation } from '@/features/account/hooks/useAccountNavigation';
import { useAccountSession } from '@/features/account/hooks/useAccountSession';
import { getAccountServices } from '@/features/account/services/getAccountServices';
import type { DeleteAccountMode, DeleteAccountOutcome } from '@/features/account/services/accountServices';
import type { AccountCopySummary } from '@/features/account/services/accountToGuestCopyService';
import type { GuestDataCounts, GuestImportProgress } from '@/features/account/services/guestImportService';
import { DELETE_ACCOUNT_CHOICES } from '@/features/account/utils/deleteAccountChoices';
import { guestCountRows, IMPORT_STAGE_LABELS, totalGuestItems } from '@/features/account/utils/guestCounts';
import { PasswordField } from '@/features/auth/components/CredentialFields';
import { spacing, useTheme } from '@/theme';

const CONFIRMATION_WORD = 'DELETE';

function describeCopy(copied: AccountCopySummary): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const add = (label: string, counts: GuestDataCounts) => {
    const total = totalGuestItems(counts);
    if (total > 0) {
      rows.push({ label, value: `${total}` });
    }
  };
  add('Copied to this device', copied.copied);
  add('Already on this device', copied.alreadyPresent);
  add('Saved as a separate copy', copied.duplicated);
  add('This device’s version kept', copied.keptGuestVersion);
  rows.push({ label: 'Checked after copying', value: `${copied.verifiedEntities}` });
  return rows;
}

export function DeleteAccountScreen() {
  const services = getAccountServices();
  const state = useAccountSession();
  const navigation = useAccountNavigation();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [mode, setMode] = useState<DeleteAccountMode>('copy_to_guest');
  const [counts, setCounts] = useState<GuestDataCounts | null>(null);
  const [progress, setProgress] = useState<GuestImportProgress | null>(null);
  const [outcome, setOutcome] = useState<DeleteAccountOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const mounted = useRef(true);
  const { colors } = useTheme();

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  useEffect(() => {
    void services
      .describeAccountCopy()
      .then((described) => {
        if (mounted.current && described !== null) {
          setCounts(described.counts);
        }
      })
      .catch(() => undefined);
  }, [services]);

  const confirmationMatches = confirmation.trim().toUpperCase() === CONFIRMATION_WORD;
  const canSubmit = confirmationMatches && password.length > 0 && !busy;

  const submit = useCallback(() => {
    if (running.current || !canSubmit) {
      return;
    }
    running.current = true;
    setBusy(true);
    setOutcome(null);
    setProgress(null);
    void (async () => {
      try {
        const result = await services.deleteAccount({
          password,
          mode,
          onCopyProgress: (update) => {
            if (mounted.current) {
              setProgress(update);
            }
          },
        });
        if (mounted.current) {
          setOutcome(result);
          if (result.status !== 'copied_not_deleted') {
            setPassword('');
          }
        }
      } finally {
        running.current = false;
        if (mounted.current) {
          setBusy(false);
        }
      }
    })();
  }, [canSubmit, mode, password, services]);

  const finished = outcome !== null && (outcome.status === 'deleted' || outcome.status === 'partial');

  if (state.status !== 'signed_in' && !finished) {
    return (
      <ScrollScreen edges={['bottom']}>
        <View style={styles.content}>
          <NoticeCard title='Not signed in' message='There is no account signed in on this device to delete.' />
          <AppButton label='Back to Account & Sync' variant='secondary' onPress={navigation.replaceWithAccount} />
        </View>
      </ScrollScreen>
    );
  }

  if (finished && outcome !== null && (outcome.status === 'deleted' || outcome.status === 'partial')) {
    return (
      <ScrollScreen edges={['bottom']}>
        <View style={styles.content}>
          <NoticeCard
            tone={outcome.status === 'partial' ? 'warning' : 'info'}
            title='Account deleted'
            message={
              outcome.status === 'partial'
                ? `Your cloud account was deleted. ${outcome.message}`
                : outcome.mode === 'copy_to_guest'
                  ? 'Your cloud account was deleted. Your data is now on this device, without an account.'
                  : 'Your cloud account was deleted and its data was removed from this device.'
            }
          />
          {outcome.copied !== null ? (
            <AppCard style={styles.card}>
              <SectionHeader title='Copied to this device' />
              {describeCopy(outcome.copied).map((row) => (
                <KeyValueRow key={row.label} label={row.label} value={row.value} />
              ))}
            </AppCard>
          ) : null}
          <AppText variant='body' tone='secondary'>
            MacroZone is back to working only on this device. You can create a new account at any time.
          </AppText>
          <AppButton label='Continue' onPress={navigation.goHome} />
        </View>
      </ScrollScreen>
    );
  }

  const rows = counts === null ? [] : guestCountRows(counts).filter((row) => row.count > 0);

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        <AppCard style={styles.card}>
          <SectionHeader title='What deleting does' />
          <AppText variant='body' tone='secondary'>
            Deleting removes the cloud copy of this account, including every meal, food, saved meal, recipe and goal it
            holds. Your other devices stop syncing and keep whatever they already downloaded. This cannot be undone.
          </AppText>
          <AppText variant='body' tone='secondary'>
            The account data stored on this device can only be opened while you are signed in to this account, so it is
            removed at the end either way. Choose the first option below if you want to keep using that data here.
          </AppText>
          <AppText variant='body' tone='secondary'>
            Exporting to a file is not available in this version of MacroZone.
          </AppText>
        </AppCard>

        {rows.length > 0 ? (
          <AppCard style={styles.card}>
            <SectionHeader title='In this account on this device' detail={`${counts === null ? 0 : totalGuestItems(counts)} items`} />
            {rows.map((row) => (
              <KeyValueRow key={row.key} label={row.label} value={`${row.count}`} />
            ))}
          </AppCard>
        ) : null}

        <FormField label='Before deleting'>
          <ChoiceList
            options={DELETE_ACCOUNT_CHOICES}
            value={mode}
            onChange={setMode}
            accessibilityLabel='What happens to your data before the account is deleted'
            disabled={busy}
          />
        </FormField>

        <PasswordField
          label='Your password'
          value={password}
          hint='Your password is checked again by the MacroZone account service before anything is deleted.'
          disabled={busy}
          onChange={setPassword}
        />

        <FormField label={`Type ${CONFIRMATION_WORD} to confirm`}>
          <AppTextInput
            value={confirmation}
            onChangeText={setConfirmation}
            autoCapitalize='characters'
            autoCorrect={false}
            editable={!busy}
            accessibilityLabel={`Type ${CONFIRMATION_WORD} to confirm`}
            maxLength={16}
          />
        </FormField>

        {busy && mode === 'copy_to_guest' ? (
          <AppCard style={styles.card}>
            <AppText variant='subheading'>Copying your data to this device…</AppText>
            <AppText variant='body' tone='secondary'>
              {progress === null
                ? 'Getting started. Nothing has been deleted yet.'
                : `${IMPORT_STAGE_LABELS[progress.entityType]}: ${progress.completed} of ${progress.total}. Nothing has been deleted yet.`}
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

        {outcome !== null && outcome.status === 'blocked' ? (
          <NoticeCard tone='danger' title='Nothing was deleted' message={outcome.message} />
        ) : null}

        {outcome !== null && outcome.status === 'failed' ? (
          <NoticeCard tone='danger' title='Nothing was deleted' message={outcome.message} />
        ) : null}

        {outcome !== null && outcome.status === 'copied_not_deleted' ? (
          <NoticeCard
            tone='warning'
            title='Copied here, but the account is still there'
            message={`${outcome.message} Your data is already copied to this device, and trying again will not copy it a second time.`}
          />
        ) : null}

        <View style={styles.actions}>
          <AppButton
            label={outcome !== null && outcome.status === 'copied_not_deleted' ? 'Try Deleting Again' : 'Delete My Account'}
            variant='danger'
            onPress={submit}
            loading={busy}
            disabled={!canSubmit}
            accessibilityHint={
              mode === 'copy_to_guest'
                ? 'Copies your data to this device first, then deletes the cloud account permanently'
                : 'Deletes the cloud account permanently and removes its data from this device'
            }
          />
          <TextButton label='Keep my account' onPress={navigation.replaceWithAccount} disabled={busy} />
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
  actions: {
    gap: spacing.sm,
  },
});
