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
import { spacing } from '@/theme';

export function ForgotPasswordScreen() {
  const services = getAccountServices();
  const state = useAccountSession();
  const navigation = useAccountNavigation();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<CredentialErrors>({});
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const submit = useCallback(() => {
    if (running.current || !state.configured) {
      return;
    }
    running.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    services.clearLinkState();
    void (async () => {
      try {
        const result = await services.auth.requestPasswordReset({ email });
        if (result.status === 'invalid') {
          setErrors(result.errors);
          return;
        }
        if (result.status === 'failed') {
          setFormError(result.message);
          return;
        }
        setSent(true);
      } finally {
        running.current = false;
        setBusy(false);
      }
    })();
  }, [email, services, state.configured]);

  const linkMessage = state.link.status === 'failed' ? state.link.message : null;

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        <AppText variant='body' tone='secondary'>
          Enter the email address for your MacroZone account. Open the link we send on this device to choose a new
          password.
        </AppText>

        {linkMessage !== null ? <NoticeCard tone='warning' message={linkMessage} /> : null}

        {sent ? (
          <NoticeCard
            title='Check your email'
            message='If that address has a MacroZone account, a reset link is on its way. The link works once and expires after a while.'
          />
        ) : null}

        {formError !== null ? <NoticeCard tone='danger' message={formError} /> : null}

        <EmailField value={email} error={errors.email} disabled={busy || !state.configured} onChange={setEmail} onSubmit={submit} />

        <View style={styles.actions}>
          <AppButton
            label='Send Reset Link'
            onPress={submit}
            loading={busy}
            disabled={busy || !state.configured}
            accessibilityHint='Sends a password reset link to this address'
          />
          <TextButton label='Back to sign in' onPress={navigation.openSignIn} />
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
