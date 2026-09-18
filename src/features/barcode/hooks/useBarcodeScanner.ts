import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { createCameraAdapter } from '@/features/barcode/adapters/cameraPermissionAdapter';
import type { ScannerStatus } from '@/features/barcode/utils/barcodeLabels';
import { normalizeScannedBarcode, type BarcodeFailureReason } from '@/features/barcode/utils/gtin';
import { createScanGate } from '@/features/barcode/utils/lookupFlow';

export function useBarcodeScanner(onBarcode: (barcode: string) => void) {
  const [adapter] = useState(createCameraAdapter);
  const [gate] = useState(createScanGate);
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [scanError, setScanError] = useState<BarcodeFailureReason | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const isFocused = useIsFocused();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!isFocused || appState !== 'active') {
      setTorchOn(false);
    }
  }, [isFocused, appState]);

  const start = async () => {
    setScanError(null);
    if (!adapter.isScanningSupported()) {
      setStatus('unavailable');
      return;
    }
    setStatus('requesting');
    const permission = await adapter.requestPermission();
    if (permission.status === 'granted') {
      gate.unlock();
      setStatus('scanning');
    } else if (permission.status === 'denied') {
      setCanAskAgain(permission.canAskAgain);
      setStatus('denied');
    } else {
      setStatus('unavailable');
    }
  };

  const stop = () => {
    gate.unlock();
    setTorchOn(false);
    setScanError(null);
    setStatus('idle');
  };

  const handleScanned = ({ type, data }: { type: string; data: string }) => {
    if (status !== 'scanning' || !gate.tryLock()) {
      return;
    }
    const normalized = normalizeScannedBarcode(type, data);
    if (!normalized.ok) {
      setScanError(normalized.reason);
      setStatus('locked');
      return;
    }
    void Haptics.selectionAsync();
    setTorchOn(false);
    setStatus('idle');
    onBarcode(normalized.value.barcode);
  };

  const scanAgain = () => {
    setScanError(null);
    gate.unlock();
    setStatus('scanning');
  };

  return {
    status,
    canAskAgain,
    scanError,
    torchOn,
    toggleTorch: () => setTorchOn((current) => !current),
    cameraActive: status === 'scanning' && isFocused && appState === 'active',
    isScanningSupported: adapter.isScanningSupported(),
    start: () => void start(),
    stop,
    scanAgain,
    handleScanned,
    openSettings: () => void adapter.openSettings(),
  };
}
