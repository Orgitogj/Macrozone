import { useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { TextButton } from '@/components/ui/TextButton';
import { useAccountNavigation } from '@/features/account/hooks/useAccountNavigation';
import { useAccountSession } from '@/features/account/hooks/useAccountSession';
import { getAccountServices } from '@/features/account/services/getAccountServices';
import { EmailField } from '@/features/auth/components/CredentialFields';
import type { CredentialErrors } from '@/features/auth/validation/credentials';
import { getSingleParam } from '@/utils/routeParams';
import { spacing } from '@/theme';

export function VerifyEmailScreen() {
  const services = getAccountServices();
  const state = useAccountSession();
  const navigation = useAccountNavigation();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState(() => getSingleParam(params.email) ?? '');
  const [errors, setErrors] = useState<CredentialErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const resend = useCallback(() => {
    if (running.current || !state.configured) {
      return;
    }
    running.current = true;
    setBusy(true);
    setErrors({});
    setNotice(null);
    setFormError(null);
    void (async () => {
      try {
        const result = await services.auth.resendVerification({ email });
        if (result.status === 'invalid') {
          setErrors(result.errors);
          return;
        }
        if (result.status === 'failed') {
          setFormError(result.message);
          return;
        }
        setNotice('If that address needs confirming, a new email is on its way. Check your spam folder too.');
      } finally {
        running.current = false;
        setBusy(false);
      }
    })();
  }, [email, services, state.configured]);

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        <AppText variant='subheading'>Confirm your email address</AppText>
        <AppText variant='body' tone='secondary'>
          MacroZone sent a confirmation link to your email. Open it on this device to finish setting up cloud backup. Until
          then, everything you log stays on this device and nothing is lost.
        </AppText>

        {notice !== null ? <NoticeCard message={notice} /> : null}
        {formError !== null ? <NoticeCard tone='danger' message={formError} /> : null}

        <EmailField value={email} error={errors.email} disabled={busy || !state.configured} onChange={setEmail} />

        <View style={styles.actions}>
          <AppButton
            label='Send the Email Again'
            onPress={resend}
            loading={busy}
            disabled={busy || !state.configured}
            accessibilityHint='Sends a new confirmation email to this address'
          />
          <TextButton label='Back to sign in' onPress={navigation.openSignIn} />
          <TextButton label='Continue without an account' tone='secondary' onPress={navigation.goHome} />
        </View>
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
  },
});
