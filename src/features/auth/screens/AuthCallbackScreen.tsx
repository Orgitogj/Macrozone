import { StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppText } from '@/components/ui/AppText';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { TextButton } from '@/components/ui/TextButton';
import { useAccountNavigation } from '@/features/account/hooks/useAccountNavigation';
import { useAccountSession } from '@/features/account/hooks/useAccountSession';
import { spacing } from '@/theme';

export function AuthCallbackScreen() {
  const state = useAccountSession();
  const navigation = useAccountNavigation();

  if (state.link.status === 'working') {
    return (
      <ScrollScreen edges={['bottom']}>
        <View style={styles.content}>
          <AppLoader accessibilityLabel='Finishing sign in' />
          <AppText variant='body' tone='secondary' align='center'>
            Finishing sign in on this device…
          </AppText>
        </View>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        {state.link.status === 'failed' ? (
          <NoticeCard title='That link did not work' message={state.link.message} />
        ) : (
          <NoticeCard
            title='Nothing left to finish'
            message='This link has already been used or was opened in another place. Your data on this device is untouched.'
          />
        )}
        <View style={styles.actions}>
          <AppButton label='Go to Account & Sync' onPress={navigation.replaceWithAccount} />
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
