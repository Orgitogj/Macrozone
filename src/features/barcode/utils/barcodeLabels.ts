import { OPEN_FOOD_FACTS } from '@/features/barcode/constants';
import type { ProviderFailureCode } from '@/features/barcode/types';
import { formatBarcodeForSpeech } from '@/features/barcode/utils/gtin';
import { formatCalories, formatGrams } from '@/utils/format';
import type { MacroTotals } from '@/types/nutrition';

export type ScannerStatus = 'idle' | 'requesting' | 'scanning' | 'locked' | 'denied' | 'unavailable';

export type FailurePresentation = {
  title: string;
  message: string;
  canRetry: boolean;
};

function waitText(seconds: number | null): string {
  if (seconds === null || seconds <= 0) {
    return 'Wait a moment and try again.';
  }
  return seconds >= 60 ? `Try again in about ${Math.ceil(seconds / 60)} min.` : `Try again in about ${seconds} s.`;
}

export function describeLookupFailure(code: ProviderFailureCode, retryAfterSeconds: number | null, hasExpiredCache: boolean): FailurePresentation {
  const cacheHint = hasExpiredCache ? ' An older saved copy of this product is available.' : '';
  switch (code) {
    case 'offline':
      return { title: 'You appear to be offline', message: `Connect to the internet and try again, or log this food manually.${cacheHint}`, canRetry: true };
    case 'timeout':
      return { title: 'The lookup took too long', message: `Try again, or log this food manually.${cacheHint}`, canRetry: true };
    case 'rate_limited':
      return { title: 'Too many lookups', message: `${OPEN_FOOD_FACTS.displayName} limits how often products can be looked up. ${waitText(retryAfterSeconds)}${cacheHint}`, canRetry: true };
    case 'unavailable':
      return { title: `${OPEN_FOOD_FACTS.displayName} is unavailable`, message: `The service is not responding right now. ${waitText(retryAfterSeconds)}${cacheHint}`, canRetry: true };
    case 'malformed':
      return { title: 'The product data could not be read', message: `${OPEN_FOOD_FACTS.displayName} returned data MacroZone could not use. Try again later or log this food manually.${cacheHint}`, canRetry: true };
    case 'not_configured':
      return { title: 'Online lookup is not set up', message: `This version of MacroZone is not set up to look up products online. You can still log this food manually.${cacheHint}`, canRetry: false };
    case 'unsupported_platform':
      return { title: 'Online lookup is not available here', message: `Online product lookup works in the Android and iOS apps. You can still log this food manually.${cacheHint}`, canRetry: false };
    case 'cancelled':
      return { title: 'Lookup cancelled', message: 'Scan or enter the barcode again when you are ready.', canRetry: true };
  }
}

export function describeScannerStatus(status: ScannerStatus): string {
  switch (status) {
    case 'idle':
      return 'Scanner off.';
    case 'requesting':
      return 'Asking for camera access.';
    case 'scanning':
      return 'Scanner ready. Center the barcode in the frame.';
    case 'locked':
      return 'Barcode detected.';
    case 'denied':
      return 'Camera access is off.';
    case 'unavailable':
      return 'The camera is not available on this device.';
  }
}

export function describeBarcodeForAccessibility(barcode: string): string {
  return `Barcode ${formatBarcodeForSpeech(barcode)}`;
}

export function describeConsumedForAccessibility(name: string, consumed: MacroTotals | null): string {
  if (consumed === null) {
    return `${name || 'This product'}: complete the amount and nutrition to see what will be added.`;
  }
  return `${name || 'This product'} adds ${formatCalories(consumed.calories)} calories, ${formatGrams(consumed.protein)} protein, ${formatGrams(consumed.carbs)} carbs, and ${formatGrams(consumed.fat)} fat.`;
}

export function describeCacheAge(fetchedAt: string, nowMs: number): string {
  const days = Math.max(0, Math.floor((nowMs - Date.parse(fetchedAt)) / 86_400_000));
  if (days === 0) {
    return 'saved today';
  }
  return days === 1 ? 'saved 1 day ago' : `saved ${days} days ago`;
}
