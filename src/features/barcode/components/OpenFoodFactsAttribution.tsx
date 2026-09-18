import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { TextButton } from '@/components/ui/TextButton';
import { openHttpsUrl } from '@/features/barcode/adapters/cameraPermissionAdapter';
import { BARCODE_COPY, OPEN_FOOD_FACTS } from '@/features/barcode/constants';
import { spacing } from '@/theme';

type OpenFoodFactsAttributionProps = {
  productUrl?: string | null;
  compact?: boolean;
};

export function OpenFoodFactsAttribution({ productUrl = null, compact = false }: OpenFoodFactsAttributionProps) {
  return (
    <View style={styles.container} accessibilityRole='summary'>
      <AppText variant='bodyStrong'>{BARCODE_COPY.attribution}</AppText>
      <AppText variant='caption' tone='secondary'>
        {compact
          ? 'Available under the Open Database License. Not endorsed by Open Food Facts.'
          : 'Product data © Open Food Facts contributors, available under the Open Database License (ODbL 1.0); individual contents under the Database Contents License (DbCL 1.0). Product images are under Creative Commons Attribution-ShareAlike (CC BY-SA 3.0). MacroZone is not affiliated with or endorsed by Open Food Facts.'}
      </AppText>
      <View style={styles.links}>
        {productUrl !== null ? (
          <TextButton
            label='View on Open Food Facts'
            size='small'
            icon='open-outline'
            onPress={() => void openHttpsUrl(productUrl)}
            accessibilityHint='Opens the product page in your browser'
          />
        ) : (
          <TextButton label='openfoodfacts.org' size='small' icon='open-outline' onPress={() => void openHttpsUrl(OPEN_FOOD_FACTS.websiteUrl)} />
        )}
        {compact ? null : (
          <TextButton label='License' size='small' tone='secondary' onPress={() => void openHttpsUrl(OPEN_FOOD_FACTS.licenseUrl)} accessibilityHint='Opens the Open Database License' />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.xl,
    rowGap: spacing.xs,
  },
});
