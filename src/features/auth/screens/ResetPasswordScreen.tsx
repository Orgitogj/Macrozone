import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppText } from '@/components/ui/AppText';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { TextButton } from '@/components/ui/TextButton';
import { useAccountNavigation } from '@/features/account/hooks/useAccountNavigation';
import { useAccountSession } from '@/features/account/hooks/useAccountSession';
import { getAccountServices } from '@/features/account/services/getAccountServices';
import { PasswordField } from '@/features/auth/components/CredentialFields';
import { PASSWORD_LIMITS, type CredentialErrors } from '@/features/auth/validation/credentials';
import { spacing } from '@/theme';

export function ResetPasswordScreen() {
  const services = getAccountServices();
  const state = useAccountSession();
  const navigation = useAccountNavigation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<CredentialErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const submit = useCallback(() => {
    if (running.current) {
      return;
    }
    running.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    void (async () => {
      try {
        const result = await services.auth.updatePassword({ password, confirmPassword });
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
        setDone(true);
      } finally {
        running.current = false;
        setBusy(false);
      }
    })();
  }, [confirmPassword, password, services]);

  if (state.link.status === 'working') {
    return (
      <ScrollScreen edges={['bottom']}>
        <AppLoader accessibilityLabel='Opening your reset link' />
      </ScrollScreen>
    );
  }

  if (state.status !== 'signed_in') {
    return (
      <ScrollScreen edges={['bottom']}>
        <View style={styles.content}>
          <NoticeCard
            title='Open the link from your email'
            message={
              state.link.status === 'failed'
                ? state.link.message
                : 'Password resets start from the link MacroZone emails you. Open that link on this device to choose a new password.'
            }
          />
          <View style={styles.actions}>
            <AppButton label='Send a New Reset Link' onPress={navigation.openForgotPassword} />
            <TextButton label='Back to sign in' onPress={navigation.openSignIn} />
          </View>
        </View>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        <AppText variant='body' tone='secondary'>
          Choose a new password for {state.email ?? 'your account'}. You stay signed in on this device.
        </AppText>

        {done ? <NoticeCard title='Password updated' message='Your new password is ready to use on your devices.' /> : null}

        {formError !== null ? <NoticeCard tone='danger' message={formError} /> : null}

        <View style={styles.form}>
          <PasswordField
            label='New password'
            value={password}
            error={errors.password}
            hint={`At least ${PASSWORD_LIMITS.minLength} characters.`}
            isNew
            disabled={busy}
            onChange={setPassword}
          />
          <PasswordField
            label='Confirm new password'
            value={confirmPassword}
            error={errors.confirmPassword}
            isNew
            disabled={busy}
            onChange={setConfirmPassword}
            onSubmit={submit}
          />
        </View>

        <View style={styles.actions}>
          <AppButton label='Save New Password' onPress={submit} loading={busy} disabled={busy} />
          <TextButton label='Go to Account & Sync' onPress={navigation.replaceWithAccount} />
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
