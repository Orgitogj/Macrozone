import { StyleSheet } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { spacing, THEME_PREFERENCE_LABELS, THEME_PREFERENCES, useThemePreference } from '@/theme';

const OPTIONS = THEME_PREFERENCES.map((value) => ({ value, label: THEME_PREFERENCE_LABELS[value] }));

export function AppearanceSettings() {
  const { preference, setPreference } = useThemePreference();

  return (
    <AppCard style={styles.card}>
      <AppText variant='subheading' accessibilityRole='header'>
        Appearance
      </AppText>
      <AppText variant='caption' tone='secondary'>
        System follows your device setting and updates automatically.
      </AppText>
      <SegmentedControl options={OPTIONS} value={preference} onChange={setPreference} accessibilityLabel='Theme' />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
});
