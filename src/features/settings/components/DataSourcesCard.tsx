import { StyleSheet } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { OpenFoodFactsAttribution } from '@/features/barcode/components/OpenFoodFactsAttribution';
import { spacing } from '@/theme';

export function DataSourcesCard() {
  return (
    <AppCard style={styles.card}>
      <AppText variant='subheading' accessibilityRole='header'>
        Data sources
      </AppText>
      <AppText variant='caption' tone='secondary'>
        Barcode lookups use Open Food Facts, a free database built by volunteers. Its data can be incomplete or wrong, so you review every product before it is saved. Products you look up are kept on this device for offline use.
      </AppText>
      <OpenFoodFactsAttribution />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
});
