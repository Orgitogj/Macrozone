import { CameraView } from 'expo-camera';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { TextButton } from '@/components/ui/TextButton';
import { SCANNER_BARCODE_TYPES } from '@/features/barcode/constants';
import { describeScannerStatus, type ScannerStatus } from '@/features/barcode/utils/barcodeLabels';
import { describeBarcodeFailure, type BarcodeFailureReason } from '@/features/barcode/utils/gtin';
import { borderWidths, componentSizes, radii, spacing, useThemedStyles, type Theme } from '@/theme';

type BarcodeScannerPanelProps = {
  status: ScannerStatus;
  cameraActive: boolean;
  canAskAgain: boolean;
  scanError: BarcodeFailureReason | null;
  torchOn: boolean;
  onScanned: (result: { type: string; data: string }) => void;
  onToggleTorch: () => void;
  onScanAgain: () => void;
  onCancel: () => void;
  onOpenSettings: () => void;
};

const BARCODE_TYPES = [...SCANNER_BARCODE_TYPES];

export function BarcodeScannerPanel({
  status,
  cameraActive,
  canAskAgain,
  scanError,
  torchOn,
  onScanned,
  onToggleTorch,
  onScanAgain,
  onCancel,
  onOpenSettings,
}: BarcodeScannerPanelProps) {
  const styles = useThemedStyles(createStyles);

  if (status === 'denied') {
    return (
      <NoticeCard
        tone='warning'
        title='Camera access is off'
        message={
          canAskAgain
            ? 'MacroZone needs camera access to scan a barcode. You can also type the barcode number below.'
            : 'Allow camera access for MacroZone in Settings to scan barcodes, or type the barcode number below.'
        }
      >
        {canAskAgain ? null : <TextButton label='Open Settings' size='small' onPress={onOpenSettings} />}
      </NoticeCard>
    );
  }

  if (status === 'unavailable') {
    return <NoticeCard tone='info' title='Scanning is not available' message='The camera cannot scan barcodes here. Type the barcode number below instead.' />;
  }

  if (status !== 'scanning' && status !== 'locked' && status !== 'requesting') {
    return null;
  }

  return (
    <AppCard style={styles.card}>
      <View style={styles.viewport} accessible={false} importantForAccessibility='no-hide-descendants'>
        {status !== 'requesting' ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing='back'
            active={cameraActive}
            enableTorch={torchOn && cameraActive}
            barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
            onBarcodeScanned={cameraActive && scanError === null ? onScanned : undefined}
          />
        ) : null}
        <View style={styles.frame} />
      </View>
      <AppText variant='bodyStrong' accessibilityLiveRegion='polite'>
        {describeScannerStatus(status)}
      </AppText>
      <AppText variant='caption' tone='secondary'>
        Hold the package steady with the barcode inside the frame. Retail food barcodes (EAN, UPC, and GTIN-14) are supported; QR codes are not.
      </AppText>
      {scanError !== null ? (
        <NoticeCard tone='danger' message={describeBarcodeFailure(scanError)}>
          <TextButton label='Scan Again' size='small' onPress={onScanAgain} />
        </NoticeCard>
      ) : null}
      <View style={styles.actions}>
        <AppButton
          label={torchOn ? 'Turn Light Off' : 'Turn Light On'}
          variant='secondary'
          onPress={onToggleTorch}
          disabled={!cameraActive}
          accessibilityLabel={torchOn ? 'Flashlight on. Turn light off' : 'Flashlight off. Turn light on'}
          style={styles.action}
        />
        <AppButton label='Cancel' variant='secondary' onPress={onCancel} accessibilityHint='Stops the camera' style={styles.action} />
      </View>
    </AppCard>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      gap: spacing.md,
    },
    viewport: {
      width: '100%',
      aspectRatio: 4 / 3,
      maxHeight: componentSizes.control * 6,
      borderRadius: radii.md,
      overflow: 'hidden',
      backgroundColor: theme.colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    frame: {
      width: '80%',
      height: '40%',
      borderRadius: radii.sm,
      borderWidth: borderWidths.thick,
      borderColor: theme.colors.primary,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    action: {
      flexGrow: 1,
      flexBasis: componentSizes.control * 3,
    },
  });
