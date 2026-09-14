import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppLoader } from '@/components/ui/AppLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { OnboardingGateProvider, useOnboardingGate } from '@/features/onboarding';
import { useReminderLifecycle } from '@/features/reminders';
import { AppThemeProvider, layout, useTheme } from '@/theme';

function RootNavigator() {
  const { colors } = useTheme();
  const { state, retry } = useOnboardingGate();
  useReminderLifecycle(state.status === 'ready' && !state.needsOnboarding);

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
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <OnboardingGateProvider>
        <RootNavigator />
      </OnboardingGateProvider>
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
