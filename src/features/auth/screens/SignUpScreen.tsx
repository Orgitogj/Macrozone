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
import { PASSWORD_LIMITS, type CredentialErrors } from '@/features/auth/validation/credentials';
import { spacing } from '@/theme';

export function SignUpScreen() {
  const services = getAccountServices();
  const state = useAccountSession();
  const navigation = useAccountNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    void (async () => {
      try {
        const result = await services.auth.signUp({ email, password, confirmPassword });
        if (result.status === 'invalid') {
          setErrors(result.errors);
          return;
        }
        if (result.status === 'failed') {
          setFormError(result.message);
          return;
        }
        setPassword('');
        setConfirmPassword('');
        if (result.value !== null) {
          await services.session.signInWithSession(result.value);
          navigation.replaceWithAccount();
          return;
        }
        navigation.openVerifyEmail(email);
      } finally {
        running.current = false;
        setBusy(false);
      }
    })();
  }, [confirmPassword, email, navigation, password, services, state.configured]);

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        <AppText variant='body' tone='secondary'>
          An account is optional. It backs up the data on this device and lets you use MacroZone on more than one device.
          Nothing leaves this device until you choose to back it up.
        </AppText>

        {!state.configured ? (
          <NoticeCard
            title='Cloud backup is not set up'
            message={state.configurationNotice ?? 'MacroZone works on this device without an account.'}
          />
        ) : null}

        {formError !== null ? <NoticeCard tone='danger' message={formError} /> : null}

        <View style={styles.form}>
          <EmailField value={email} error={errors.email} disabled={busy || !state.configured} onChange={setEmail} />
          <PasswordField
            label='Password'
            value={password}
            error={errors.password}
            hint={`At least ${PASSWORD_LIMITS.minLength} characters.`}
            isNew
            disabled={busy || !state.configured}
            onChange={setPassword}
          />
          <PasswordField
            label='Confirm password'
            value={confirmPassword}
            error={errors.confirmPassword}
            isNew
            disabled={busy || !state.configured}
            onChange={setConfirmPassword}
            onSubmit={submit}
          />
        </View>

        <View style={styles.actions}>
          <AppButton
            label='Create Account'
            onPress={submit}
            loading={busy}
            disabled={busy || !state.configured}
            accessibilityHint='Creates an account and sends a confirmation email'
          />
          <TextButton label='I already have an account' onPress={navigation.openSignIn} />
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
