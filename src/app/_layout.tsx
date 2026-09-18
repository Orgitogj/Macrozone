import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppLoader } from '@/components/ui/AppLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { AccountProvider, useAuthLinkHandler } from '@/features/account';
import { OnboardingGateProvider, useOnboardingGate } from '@/features/onboarding';
import { useReminderLifecycle } from '@/features/reminders';
import { AppThemeProvider, layout, useTheme } from '@/theme';

function RootNavigator() {
  const { colors } = useTheme();
  const { state, retry } = useOnboardingGate();
  useReminderLifecycle(state.status === 'ready' && !state.needsOnboarding);
  useAuthLinkHandler(state.status === 'ready');

  if (state.status !== 'ready') {
    return (
      <View style={[styles.gate, { backgroundColor: colors.background }]}>
        {state.status === 'loading' ? <AppLoader accessibilityLabel='Starting MacroZone' /> : null}
        {state.status === 'error' ? <ErrorState message={state.message} onRetry={retry} /> : null}
      </View>
    );
  }

  const detailScreenOptions = {
    headerShown: true,
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.primary,
    headerTitleStyle: { color: colors.textPrimary },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background },
  } as const;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={state.needsOnboarding}>
        <Stack.Screen name='onboarding' options={{ gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!state.needsOnboarding}>
        <Stack.Screen name='(tabs)' />
        <Stack.Screen name='meal/[id]' options={detailScreenOptions} />
        <Stack.Screen name='meal/new' options={detailScreenOptions} />
        <Stack.Screen name='goals/index' options={{ ...detailScreenOptions, title: 'Nutrition Goals' }} />
        <Stack.Screen name='goals/calculate' options={{ ...detailScreenOptions, title: 'Calculate Goals' }} />
        <Stack.Screen name='goals/edit' options={{ ...detailScreenOptions, title: 'Edit Goals' }} />
        <Stack.Screen name='reminders' options={{ ...detailScreenOptions, title: 'Meal Reminders' }} />
        <Stack.Screen name='food/new' options={{ ...detailScreenOptions, title: 'New Food' }} />
        <Stack.Screen name='food/[id]/index' options={{ ...detailScreenOptions, title: 'Food' }} />
        <Stack.Screen name='food/[id]/edit' options={{ ...detailScreenOptions, title: 'Edit Food' }} />
        <Stack.Screen name='saved-meal/new' options={{ ...detailScreenOptions, title: 'New Saved Meal' }} />
        <Stack.Screen name='saved-meal/[id]/index' options={{ ...detailScreenOptions, title: 'Saved Meal' }} />
        <Stack.Screen name='saved-meal/[id]/edit' options={{ ...detailScreenOptions, title: 'Edit Saved Meal' }} />
        <Stack.Screen name='recipe/new' options={{ ...detailScreenOptions, title: 'New Recipe' }} />
        <Stack.Screen name='recipe/[id]/index' options={{ ...detailScreenOptions, title: 'Recipe' }} />
        <Stack.Screen name='recipe/[id]/edit' options={{ ...detailScreenOptions, title: 'Edit Recipe' }} />
        <Stack.Screen name='ai-meal' options={{ ...detailScreenOptions, title: 'AI Estimate' }} />
        <Stack.Screen name='barcode' options={{ ...detailScreenOptions, title: 'Barcode' }} />
      </Stack.Protected>
      <Stack.Screen name='auth/sign-in' options={{ ...detailScreenOptions, title: 'Sign In' }} />
      <Stack.Screen name='auth/sign-up' options={{ ...detailScreenOptions, title: 'Create Account' }} />
      <Stack.Screen name='auth/verify-email' options={{ ...detailScreenOptions, title: 'Confirm Your Email' }} />
      <Stack.Screen name='auth/forgot-password' options={{ ...detailScreenOptions, title: 'Reset Password' }} />
      <Stack.Screen name='auth/reset-password' options={{ ...detailScreenOptions, title: 'New Password' }} />
      <Stack.Screen name='auth/callback' options={{ ...detailScreenOptions, title: 'Finishing Sign In' }} />
      <Stack.Screen name='account/index' options={{ ...detailScreenOptions, title: 'Account & Sync' }} />
      <Stack.Screen name='account/import' options={{ ...detailScreenOptions, title: 'Data On This Device' }} />
      <Stack.Screen name='account/conflicts' options={{ ...detailScreenOptions, title: 'Needs Your Decision' }} />
      <Stack.Screen name='account/conflict/[id]' options={{ ...detailScreenOptions, title: 'Choose A Version' }} />
      <Stack.Screen name='account/delete' options={{ ...detailScreenOptions, title: 'Delete Account' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AccountProvider>
        <OnboardingGateProvider>
          <RootNavigator />
        </OnboardingGateProvider>
      </AccountProvider>
    </AppThemeProvider>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingHorizontal,
  },
});
