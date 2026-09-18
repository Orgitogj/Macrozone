import { useRouter } from 'expo-router';

export function useAccountNavigation() {
  const router = useRouter();

  return {
    openAccount: () => router.push('/account'),
    replaceWithAccount: () => router.replace('/account'),
    openSignIn: () => router.push('/auth/sign-in'),
    openSignUp: () => router.push('/auth/sign-up'),
    openForgotPassword: () => router.push('/auth/forgot-password'),
    openVerifyEmail: (email: string) => router.push({ pathname: '/auth/verify-email', params: { email } }),
    openGuestImport: () => router.push('/account/import'),
    openConflicts: () => router.push('/account/conflicts'),
    openConflict: (conflictId: string) => router.push({ pathname: '/account/conflict/[id]', params: { id: conflictId } }),
    openDeleteAccount: () => router.push('/account/delete'),
    goHome: () => router.replace('/(tabs)'),
    goBack: () => {
      if (router.canGoBack()) {
        router.back();
        return;
      }
      router.replace('/account');
    },
  };
}
