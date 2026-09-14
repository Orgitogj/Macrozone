import type { ViewStyle } from 'react-native';

import type { THEME_PREFERENCES } from '@/theme/themePreference';

export type ColorScheme = 'light' | 'dark';

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  overlay: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
  primary: string;
  primaryPressed: string;
  primarySubtle: string;
  border: string;
  borderFocused: string;
  success: string;
  warning: string;
  warningSubtle: string;
  danger: string;
  dangerSubtle: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
};

export type ThemeShadows = {
  card: ViewStyle;
};

export type Theme = {
  scheme: ColorScheme;
  colors: ThemeColors;
  shadows: ThemeShadows;
};
