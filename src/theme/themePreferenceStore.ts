import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_THEME_PREFERENCE, isThemePreference } from '@/theme/themePreference';
import type { ThemePreference } from '@/theme/types';

export const THEME_PREFERENCE_STORAGE_KEY = 'theme_preference';

type PreferenceStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export type ThemePreferenceStore = {
  load(): Promise<ThemePreference>;
  save(preference: ThemePreference): Promise<void>;
};

export function createThemePreferenceStore(storage: PreferenceStorage = AsyncStorage): ThemePreferenceStore {
  return {
    load: async () => {
      try {
        const stored = await storage.getItem(THEME_PREFERENCE_STORAGE_KEY);
        return isThemePreference(stored) ? stored : DEFAULT_THEME_PREFERENCE;
      } catch {
        return DEFAULT_THEME_PREFERENCE;
      }
    },
    save: async (preference) => {
      await storage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
    },
  };
}
