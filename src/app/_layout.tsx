import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppLoader } from '@/components/ui/AppLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { OnboardingGateProvider, useOnboardingGate } from '@/features/onboarding';
import { colors } from '@/styles/global';

const detailScreenOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
} as const;

function RootNavigator() {
  const { state, retry } = useOnboardingGate();

  if (state.status !== 'ready') {
    return (
      <View style={styles.gate}>
        {state.status === 'loading' ? <AppLoader accessibilityLabel='Starting MacroZone' /> : null}
        {state.status === 'error' ? <ErrorState message={state.message} onRetry={retry} /> : null}
      </View>
    );
  }

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
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <OnboardingGateProvider>
      <RootNavigator />
    </OnboardingGateProvider>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: colors.background,
  },
});
