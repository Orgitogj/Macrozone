import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { createCameraAdapter } from '@/features/barcode/adapters/cameraPermissionAdapter';
import { getBarcodeServices } from '@/features/barcode/services/getBarcodeServices';
import { buildDestinationParams, resolveLogDestination } from '@/features/library/utils/libraryRoutes';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { buildManualMealRouteParams } from '@/features/meals/utils/mealRoutes';
import { getTodayDateKey } from '@/utils/date';
import { getSingleParam } from '@/utils/routeParams';

export type BarcodeEntryMode = 'scan' | 'manual';

export function parseBarcodeEntryMode(value: string | string[] | undefined): BarcodeEntryMode {
  return getSingleParam(value) === 'scan' ? 'scan' : 'manual';
}

export function useBarcodeAvailability() {
  const [availability] = useState(() => ({
    ...getBarcodeServices().lookup.availability(),
    scanningSupported: createCameraAdapter().isScanningSupported(),
  }));
  return availability;
}

export function useBarcodeNavigation() {
  const router = useRouter();
  return {
    openBarcode: (destination: LogDestination, mode: BarcodeEntryMode) =>
      router.push({ pathname: '/barcode', params: { ...buildDestinationParams(destination), mode } }),
    replaceWithManual: (destination: LogDestination) =>
      router.replace({ pathname: '/meal/new', params: buildManualMealRouteParams(destination) }),
    createFood: (destination: LogDestination) => router.push({ pathname: '/food/new', params: buildDestinationParams(destination) }),
  };
}

export function useBarcodeRouteParams(): { destination: LogDestination; mode: BarcodeEntryMode } {
  const params = useLocalSearchParams<{ date?: string; mealType?: string; mode?: string }>();
  const [route] = useState(() => ({
    destination: resolveLogDestination(params, getTodayDateKey(), new Date()),
    mode: parseBarcodeEntryMode(params.mode),
  }));
  return route;
}
