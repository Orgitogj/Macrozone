import { Stack } from 'expo-router';

import { colors } from '@/styles/global';

const detailScreenOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
} as const;

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name='(tabs)' />
      <Stack.Screen name='meal/[id]' options={detailScreenOptions} />
      <Stack.Screen name='meal/new' options={detailScreenOptions} />
    </Stack>
  );
}
