import type { OnlineProviderId, ProviderLookupOutcome } from '@/features/barcode/types';

export type ProviderAvailability =
  | { status: 'available' }
  | { status: 'not_configured'; reason: string }
  | { status: 'unsupported_platform' };

export type OnlineFoodProvider = {
  readonly id: OnlineProviderId;
  readonly displayName: string;
  availability(): ProviderAvailability;
  lookupBarcode(barcode: string, options: { signal: AbortSignal }): Promise<ProviderLookupOutcome>;
  productPageUrl(barcode: string): string;
};
