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
import { EmailField, PasswordField } from '@/features/auth/components/CredentialFields';
import type { CredentialErrors } from '@/features/auth/validation/credentials';
import { spacing } from '@/theme';

export function SignInScreen() {
  const services = getAccountServices();
  const state = useAccountSession();
  const navigation = useAccountNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<CredentialErrors>({});
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
        const result = await services.signInWithPassword({ email, password });
        if (result.status === 'invalid') {
          setErrors(result.errors);
          return;
        }
        if (result.status === 'failed') {
          if (result.code === 'email_not_verified') {
            navigation.openVerifyEmail(email);
            return;
          }
          setFormError(result.message);
          return;
        }
        setPassword('');
        navigation.replaceWithAccount();
      } finally {
        running.current = false;
        setBusy(false);
      }
    })();
  }, [email, navigation, password, services, state.configured]);

  const linkMessage = state.link.status === 'failed' ? state.link.message : null;

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        <AppText variant='body' tone='secondary'>
          Signing in backs up your MacroZone data and keeps your devices in sync. Everything you log keeps working on this
          device either way.
        </AppText>

        {!state.configured ? (
          <NoticeCard
            title='Cloud backup is not set up'
            message={state.configurationNotice ?? 'MacroZone works on this device without an account.'}
          />
        ) : null}

        {linkMessage !== null ? <NoticeCard tone='warning' message={linkMessage} /> : null}

        {formError !== null ? <NoticeCard tone='danger' message={formError} /> : null}

        <View style={styles.form}>
          <EmailField value={email} error={errors.email} disabled={busy || !state.configured} onChange={setEmail} />
          <PasswordField
            label='Password'
            value={password}
            error={errors.password}
            disabled={busy || !state.configured}
            onChange={setPassword}
            onSubmit={submit}
          />
        </View>

        <View style={styles.actions}>
          <AppButton
            label='Sign In'
            onPress={submit}
            loading={busy}
            disabled={busy || !state.configured}
            accessibilityHint='Signs in and starts cloud backup for this account'
          />
          <TextButton label='Forgot your password?' onPress={navigation.openForgotPassword} />
          <TextButton label='Create an account' onPress={navigation.openSignUp} />
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
  form: {
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
});
