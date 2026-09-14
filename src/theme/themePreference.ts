import type { ColorScheme, ThemePreference } from '@/theme/types';

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

export const FALLBACK_COLOR_SCHEME: ColorScheme = 'dark';

export const THEME_PREFERENCE_LABELS: Readonly<Record<ThemePreference, string>> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function resolveColorScheme(
  preference: ThemePreference,
  systemScheme: string | null | undefined,
): ColorScheme {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }
  if (systemScheme === 'light' || systemScheme === 'dark') {
    return systemScheme;
  }
  return FALLBACK_COLOR_SCHEME;
}
