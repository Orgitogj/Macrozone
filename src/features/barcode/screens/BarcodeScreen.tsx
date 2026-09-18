import { useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { TextButton } from '@/components/ui/TextButton';
import { BarcodeScannerPanel } from '@/features/barcode/components/BarcodeScannerPanel';
import { LookupStateNotice } from '@/features/barcode/components/LookupStateNotice';
import { ManualBarcodeForm } from '@/features/barcode/components/ManualBarcodeForm';
import { OpenFoodFactsAttribution } from '@/features/barcode/components/OpenFoodFactsAttribution';
import { ProductReviewForm } from '@/features/barcode/components/ProductReviewForm';
import { BARCODE_COPY, describeNotConfigured } from '@/features/barcode/constants';
import { useBarcodeFlow } from '@/features/barcode/hooks/useBarcodeFlow';
import { useBarcodeNavigation, type BarcodeEntryMode } from '@/features/barcode/hooks/useBarcodeNavigation';
import { useBarcodeScanner } from '@/features/barcode/hooks/useBarcodeScanner';
import { describeBarcodeForAccessibility, describeLookupFailure } from '@/features/barcode/utils/barcodeLabels';
import { LogDestinationFields } from '@/features/meals/components/LogDestinationFields';
import { useMealNavigation } from '@/features/meals/hooks/useMealNavigation';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { useTodayDateKey } from '@/hooks/useTodayDateKey';
import { spacing, useTheme } from '@/theme';

type BarcodeScreenProps = {
  initialDestination: LogDestination;
  initialMode: BarcodeEntryMode;
};

export function BarcodeScreen({ initialDestination, initialMode }: BarcodeScreenProps) {
  const { colors } = useTheme();
  const todayKey = useTodayDateKey();
  const flow = useBarcodeFlow();
  const scanner = useBarcodeScanner(flow.lookupBarcode);
  const navigation = useBarcodeNavigation();
  const mealNavigation = useMealNavigation();
  const [destination, setDestination] = useState(initialDestination);
  const [startedScanner, setStartedScanner] = useState(false);
  const { state } = flow;

  useEffect(() => {
    if (initialMode === 'scan' && !startedScanner && scanner.isScanningSupported) {
      setStartedScanner(true);
      scanner.start();
    }
  }, [initialMode, startedScanner, scanner]);

  const failureTitle = state.phase === 'failed' ? describeLookupFailure(state.result.code, state.result.retryAfterSeconds, state.result.expiredCache !== null).title : null;

  const lookingUpBarcode = state.phase === 'looking_up' ? state.barcode : null;

  useEffect(() => {
    if (lookingUpBarcode !== null) {
      AccessibilityInfo.announceForAccessibility(`Looking up ${describeBarcodeForAccessibility(lookingUpBarcode)}.`);
    } else if (state.phase === 'review') {
      AccessibilityInfo.announceForAccessibility('Product found. Review the details before adding it.');
    } else if (state.phase === 'not_found') {
      AccessibilityInfo.announceForAccessibility('Product not found.');
    } else if (failureTitle !== null) {
      AccessibilityInfo.announceForAccessibility(failureTitle);
    }
  }, [state.phase, failureTitle, lookingUpBarcode]);

  const logManually = () => navigation.replaceWithManual(destination);
  const scanAnother = () => {
    flow.reset();
    if (scanner.isScanningSupported) {
      scanner.start();
    }
  };
  const enterBarcode = () => {
    scanner.stop();
    flow.reset();
  };

  if (state.phase === 'review') {
    return (
      <ScrollScreen edges={['bottom']}>
        <ProductReviewForm
          draft={state.draft}
          destination={destination}
          todayKey={todayKey}
          nowMs={Date.now()}
          errors={flow.reviewErrors}
          saveMessage={flow.saveMessage}
          isSaving={flow.isSaving}
          linkedFood={flow.linkedFood}
          foodDecision={flow.foodDecision}
          onChangeDestination={setDestination}
          onEdit={flow.editDraft}
          onFoodDecision={flow.setFoodDecision}
          onSave={() => void flow.save(destination, todayKey, () => mealNavigation.showDay(destination.date))}
          onRetry={flow.retry}
          onScanAnother={scanAnother}
          onLogManually={logManually}
        />
      </ScrollScreen>
    );
  }

  const secondaryActions = [
    ...(scanner.isScanningSupported ? [{ label: 'Scan Again', onPress: scanAnother }] : []),
    { label: 'Enter Barcode', onPress: enterBarcode },
    { label: 'Create Food', onPress: () => navigation.createFood(destination), hint: 'Opens the new food form' },
    { label: 'Log Manually', onPress: logManually, hint: 'Opens the manual meal form' },
  ];

  const isLookingUp = state.phase === 'looking_up';
  const scannerVisible = scanner.status !== 'idle';

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        <LogDestinationFields destination={destination} todayKey={todayKey} onChange={setDestination} disabled={isLookingUp} />

        {flow.availability.status === 'unsupported_platform' ? <NoticeCard tone='info' message={BARCODE_COPY.webUnavailable} /> : null}
        {flow.availability.status === 'not_configured' ? <NoticeCard tone='info' message={describeNotConfigured(__DEV__)} /> : null}

        {isLookingUp ? (
          <AppCard style={styles.progress}>
            <View style={styles.progressRow} accessible accessibilityRole='progressbar' accessibilityLabel={`Looking up ${describeBarcodeForAccessibility(state.barcode)}`}>
              <ActivityIndicator color={colors.primary} />
              <View style={styles.progressText}>
                <AppText variant='bodyStrong'>Looking up product…</AppText>
                <AppText variant='caption' tone='secondary'>
                  {`Barcode ${state.barcode}`}
                </AppText>
              </View>
            </View>
            <AppButton label='Cancel' variant='secondary' onPress={flow.cancel} />
          </AppCard>
        ) : null}

        {state.phase === 'not_found' ? (
          <LookupStateNotice
            kind='not_found'
            barcode={state.barcode}
            fromCache={state.fromCache}
            actions={{ retry: { label: 'Try Again', onPress: flow.retry }, secondary: secondaryActions }}
          />
        ) : null}

        {state.phase === 'failed' ? (
          <LookupStateNotice
            kind='failed'
            barcode={state.barcode}
            code={state.result.code}
            retryAfterSeconds={state.result.retryAfterSeconds}
            hasExpiredCache={state.result.expiredCache !== null}
            actions={{
              retry: { label: 'Try Again', onPress: flow.retry },
              useCached: { label: 'Use Saved Copy', onPress: flow.openExpiredCache, hint: 'Shows an older saved copy of this product. It may be out of date.' },
              secondary: secondaryActions,
            }}
          />
        ) : null}

        {!isLookingUp && scanner.isScanningSupported ? (
          scannerVisible ? (
            <BarcodeScannerPanel
              status={scanner.status}
              cameraActive={scanner.cameraActive}
              canAskAgain={scanner.canAskAgain}
              scanError={scanner.scanError}
              torchOn={scanner.torchOn}
              onScanned={scanner.handleScanned}
              onToggleTorch={scanner.toggleTorch}
              onScanAgain={scanner.scanAgain}
              onCancel={scanner.stop}
              onOpenSettings={scanner.openSettings}
            />
          ) : (
            <AppButton
              label='Scan Barcode'
              onPress={scanner.start}
              accessibilityHint='Starts the camera. Camera access is requested only now.'
            />
          )
        ) : null}

        {!isLookingUp ? (
          <ManualBarcodeForm value={flow.manualText} error={flow.manualError} onChange={flow.setManualText} onSubmit={flow.submitManual} />
        ) : null}

        {!isLookingUp ? (
          <View style={styles.links}>
            <TextButton label='Create Food' onPress={() => navigation.createFood(destination)} />
            <TextButton label='Log Manually Instead' onPress={logManually} />
          </View>
        ) : null}

        <OpenFoodFactsAttribution />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
  progress: {
    gap: spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressText: {
    flex: 1,
    gap: spacing.xxs,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.xl,
    rowGap: spacing.xs,
  },
});
