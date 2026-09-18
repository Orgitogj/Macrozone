import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppLoader } from '@/components/ui/AppLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAccountSession } from '@/features/account/hooks/useAccountSession';
import { getAccountServices } from '@/features/account/services/getAccountServices';
import { layout, useTheme } from '@/theme';

const PREPARE_FAILED =
  'MacroZone could not prepare your data on this device. Try again, or restart the app if this keeps happening.';

export function AccountProvider({ children }: { children: ReactNode }) {
  const services = getAccountServices();
  const state = useAccountSession();
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void services.initialize().catch(() => {
      if (!cancelled) {
        setError(PREPARE_FAILED);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [services, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  if (error !== null) {
    return (
      <View style={[styles.gate, { backgroundColor: colors.background }]}>
        <ErrorState message={error} onRetry={retry} />
      </View>
    );
  }

  if (state.status === 'restoring') {
    return (
      <View style={[styles.gate, { backgroundColor: colors.background }]}>
        <AppLoader accessibilityLabel='Preparing your MacroZone data' />
      </View>
    );
  }

  return <Fragment key={state.scopeId}>{children}</Fragment>;
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingHorizontal,
  },
});
