import { BARCODE_LIMITS, OPEN_FOOD_FACTS } from '@/features/barcode/constants';
import type { OnlineFoodProvider } from '@/features/barcode/providers/onlineFoodProvider';
import { buildProductRequest, type OpenFoodFactsConfig } from '@/features/barcode/providers/openFoodFacts/openFoodFactsConfig';
import { parseOpenFoodFactsResponse } from '@/features/barcode/providers/openFoodFacts/openFoodFactsResponse';
import type { ProviderFailureCode, ProviderLookupOutcome } from '@/features/barcode/types';
import { parseRetryAfter, type RequestRateLimiter } from '@/features/barcode/utils/requestRateLimiter';

export type ProductFetch = (
  url: string,
  init: { method: 'GET'; headers: Record<string, string>; signal: AbortSignal; credentials: 'omit' },
) => Promise<{ status: number; headers: { get(name: string): string | null }; text(): Promise<string> }>;

export type ProviderScheduler = {
  now: () => number;
  sleep: (ms: number, signal: AbortSignal) => Promise<void>;
  random: () => number;
};

const TRANSIENT_STATUSES: readonly number[] = [500, 502, 504];

function failed(code: ProviderFailureCode, retryable: boolean, retryAfterSeconds: number | null = null): ProviderLookupOutcome {
  return { status: 'failed', code, retryable, retryAfterSeconds };
}

export function createOpenFoodFactsProvider({
  config,
  fetchImpl,
  rateLimiter,
  scheduler,
}: {
  config: OpenFoodFactsConfig;
  fetchImpl: ProductFetch;
  rateLimiter: RequestRateLimiter;
  scheduler: ProviderScheduler;
}): OnlineFoodProvider {
  const attemptOnce = async (
    url: string,
    headers: Record<string, string>,
    barcode: string,
    signal: AbortSignal,
    timeoutMs: number,
  ): Promise<{ kind: 'outcome'; outcome: ProviderLookupOutcome } | { kind: 'transient'; code: ProviderFailureCode }> => {
    const controller = new AbortController();
    let timedOut = false;
    const onAbort = () => controller.abort();
    signal.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      let response: Awaited<ReturnType<ProductFetch>>;
      try {
        response = await fetchImpl(url, { method: 'GET', headers, signal: controller.signal, credentials: 'omit' });
      } catch {
        if (signal.aborted) {
          return { kind: 'outcome', outcome: failed('cancelled', false) };
        }
        return { kind: 'transient', code: timedOut ? 'timeout' : 'offline' };
      }
      if (response.status === 429 || response.status === 503) {
        const retryAfter =
          parseRetryAfter(response.headers.get('retry-after'), scheduler.now(), BARCODE_LIMITS.maxRetryAfterSeconds) ??
          (response.status === 429 ? BARCODE_LIMITS.defaultRateLimitRetryAfterSeconds : null);
        if (retryAfter !== null) {
          rateLimiter.blockUntil(scheduler.now() + retryAfter * 1000);
        }
        return {
          kind: 'outcome',
          outcome: failed(response.status === 429 ? 'rate_limited' : 'unavailable', true, retryAfter),
        };
      }
      if (TRANSIENT_STATUSES.includes(response.status)) {
        return { kind: 'transient', code: 'unavailable' };
      }
      let text: string;
      try {
        text = await response.text();
      } catch {
        if (signal.aborted) {
          return { kind: 'outcome', outcome: failed('cancelled', false) };
        }
        return { kind: 'transient', code: timedOut ? 'timeout' : 'offline' };
      }
      if (signal.aborted) {
        return { kind: 'outcome', outcome: failed('cancelled', false) };
      }
      return { kind: 'outcome', outcome: parseOpenFoodFactsResponse(response.status, text, barcode) };
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
    }
  };

  return {
    id: 'open_food_facts',
    displayName: OPEN_FOOD_FACTS.displayName,

    availability: () => {
      if (config.status === 'ready') {
        return { status: 'available' };
      }
      return config.status === 'unsupported_platform' ? { status: 'unsupported_platform' } : { status: 'not_configured', reason: config.reason };
    },

    productPageUrl: (barcode) => `${OPEN_FOOD_FACTS.productPageBaseUrl}${barcode}`,

    lookupBarcode: async (barcode, { signal }) => {
      if (config.status === 'unsupported_platform') {
        return failed('unsupported_platform', false);
      }
      if (config.status !== 'ready') {
        return failed('not_configured', false);
      }
      if (signal.aborted) {
        return failed('cancelled', false);
      }
      const { url, headers } = buildProductRequest(config, barcode);
      const deadline = scheduler.now() + BARCODE_LIMITS.lookupTotalTimeoutMs;
      let lastCode: ProviderFailureCode = 'offline';
      for (let attempt = 0; attempt <= BARCODE_LIMITS.maxRetryAttempts; attempt += 1) {
        const remaining = deadline - scheduler.now();
        if (remaining <= 0) {
          return failed('timeout', true);
        }
        const permit = rateLimiter.tryAcquire(scheduler.now());
        if (!permit.allowed) {
          return failed('rate_limited', true, permit.retryAfterSeconds);
        }
        const result = await attemptOnce(url, headers, barcode, signal, Math.min(BARCODE_LIMITS.lookupAttemptTimeoutMs, remaining));
        if (result.kind === 'outcome') {
          return result.outcome;
        }
        lastCode = result.code;
        if (attempt === BARCODE_LIMITS.maxRetryAttempts) {
          break;
        }
        const delay = Math.round(BARCODE_LIMITS.retryBaseDelayMs * (1 + Math.min(Math.max(scheduler.random(), 0), 1)));
        if (scheduler.now() + delay >= deadline) {
          break;
        }
        try {
          await scheduler.sleep(delay, signal);
        } catch {
          return failed('cancelled', false);
        }
        if (signal.aborted) {
          return failed('cancelled', false);
        }
      }
      return failed(lastCode, true);
    },
  };
}
