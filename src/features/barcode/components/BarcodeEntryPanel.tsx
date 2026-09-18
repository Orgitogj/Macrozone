import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { TextButton } from '@/components/ui/TextButton';
import { OpenFoodFactsAttribution } from '@/features/barcode/components/OpenFoodFactsAttribution';
import { BARCODE_COPY, describeNotConfigured } from '@/features/barcode/constants';
import { useBarcodeAvailability, useBarcodeNavigation } from '@/features/barcode/hooks/useBarcodeNavigation';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { spacing } from '@/theme';

type BarcodeEntryPanelProps = {
  destination: LogDestination;
  onLogManually: () => void;
};

export function BarcodeEntryPanel({ destination, onLogManually }: BarcodeEntryPanelProps) {
  const availability = useBarcodeAvailability();
  const navigation = useBarcodeNavigation();

  return (
    <View style={styles.container}>
      <AppCard style={styles.card}>
        <AppText variant='subheading' accessibilityRole='header'>
          Packaged food
        </AppText>
        <AppText variant='body' tone='secondary'>
          Scan the barcode or type its number to look up the product. You review everything before it is added.
        </AppText>
        {availability.status === 'unsupported_platform' ? <NoticeCard tone='info' message={BARCODE_COPY.webUnavailable} /> : null}
        {availability.status === 'not_configured' ? <NoticeCard tone='info' message={describeNotConfigured(__DEV__)} /> : null}
        <View style={styles.actions}>
          {availability.scanningSupported ? (
            <AppButton
              label='Scan Barcode'
              onPress={() => navigation.openBarcode(destination, 'scan')}
              accessibilityHint='Opens the barcode scanner. Camera access is requested only when you start scanning.'
            />
          ) : null}
          <AppButton
            label='Enter Barcode'
            variant={availability.scanningSupported ? 'secondary' : 'primary'}
            onPress={() => navigation.openBarcode(destination, 'manual')}
            accessibilityHint='Opens the barcode screen with the number field'
          />
        </View>
        <OpenFoodFactsAttribution compact />
      </AppCard>
      <TextButton label='Log Manually Instead' onPress={onLogManually} accessibilityHint='Shows the manual meal form' />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
});
