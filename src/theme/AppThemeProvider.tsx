import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';

import { createNavigationTheme } from '@/theme/navigationTheme';
import { themes } from '@/theme/palettes';
import { DEFAULT_THEME_PREFERENCE, resolveColorScheme } from '@/theme/themePreference';
import { createThemePreferenceStore, type ThemePreferenceStore } from '@/theme/themePreferenceStore';
import type { Theme, ThemePreference } from '@/theme/types';

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const defaultStore = createThemePreferenceStore();

export function AppThemeProvider({
  children,
  store = defaultStore,
}: {
  children: ReactNode;
  store?: ThemePreferenceStore;
}) {
  const systemScheme = useColorScheme();
  const [loadedPreference, setLoadedPreference] = useState<ThemePreference | null>(null);

  useEffect(() => {
    let active = true;
    void store.load().then((preference) => {
      if (active) {
        setLoadedPreference((current) => current ?? preference);
      }
    });
    return () => {
      active = false;
    };
  }, [store]);

  const preference = loadedPreference ?? DEFAULT_THEME_PREFERENCE;
  const theme = themes[resolveColorScheme(preference, systemScheme)];

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => undefined);
  }, [theme]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setLoadedPreference(next);
      void store.save(next).catch((error: unknown) => {
        if (__DEV__) {
          console.warn('[theme] Failed to save theme preference', error);
        }
      });
    },
    [store],
  );

  const navigationTheme = useMemo(() => createNavigationTheme(theme), [theme]);
  const value = useMemo(() => ({ theme, preference, setPreference }), [theme, preference, setPreference]);

  if (loadedPreference === null) {
    return <View style={[styles.placeholder, { backgroundColor: theme.colors.background }]} />;
  }

  return (
    <ThemeContext.Provider value={value}>
      <NavigationThemeProvider value={navigationTheme}>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        {children}
      </NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('Theme hooks must be used inside AppThemeProvider.');
  }
  return context;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}

export function useThemePreference(): Pick<ThemeContextValue, 'preference' | 'setPreference'> {
  const { preference, setPreference } = useThemeContext();
  return { preference, setPreference };
}

export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
  },
});
