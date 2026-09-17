import { ProviderError } from './provider.ts';

export type AttemptFailure =
  | { kind: 'transient'; error: ProviderError }
  | { kind: 'rate_limited'; error: ProviderError; retryAfterMs: number | null }
  | { kind: 'final'; error: ProviderError };

export type Sleep = (ms: number, signal: AbortSignal) => Promise<void>;

export type RetryPolicy = {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  minAttemptMs: number;
};

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 1,
  baseDelayMs: 500,
  maxDelayMs: 4000,
  minAttemptMs: 2000,
};

export function computeBackoffMs(retryNumber: number, policy: RetryPolicy, random: () => number): number {
  const ceiling = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** (retryNumber - 1));
  return Math.round(ceiling / 2 + (ceiling / 2) * Math.min(Math.max(random(), 0), 1));
}

export const realSleep: Sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });

function abortError(signal: AbortSignal): ProviderError {
  const reason: unknown = signal.reason;
  const isDeadline = typeof reason === 'object' && reason !== null && 'name' in reason && reason.name === 'TimeoutError';
  return isDeadline ? new ProviderError('AI_TIMEOUT', 'aborted_by_deadline') : new ProviderError('CANCELLED', 'aborted_by_client');
}

export async function runWithRetries<T>({
  attempt,
  classify,
  policy,
  signal,
  deadlineAt,
  now,
  sleep,
  random,
}: {
  attempt: (timeoutMs: number, attemptNumber: number) => Promise<T>;
  classify: (error: unknown) => AttemptFailure;
  policy: RetryPolicy;
  signal: AbortSignal;
  deadlineAt: number;
  now: () => number;
  sleep: Sleep;
  random: () => number;
}): Promise<{ value: T; attempts: number }> {
  let attemptNumber = 0;
  for (;;) {
    if (signal.aborted) {
      throw abortError(signal);
    }
    const remaining = deadlineAt - now();
    if (remaining < policy.minAttemptMs) {
      throw new ProviderError('AI_TIMEOUT', attemptNumber === 0 ? 'deadline_before_attempt' : 'deadline_before_retry');
    }
    attemptNumber += 1;
    let failure: AttemptFailure;
    try {
      return { value: await attempt(remaining, attemptNumber), attempts: attemptNumber };
    } catch (error) {
      if (signal.aborted) {
        throw abortError(signal);
      }
      failure = classify(error);
    }
    if (failure.kind === 'final' || attemptNumber > policy.maxRetries) {
      throw failure.error;
    }
    let delayMs: number;
    if (failure.kind === 'rate_limited') {
      if (failure.retryAfterMs === null) {
        throw failure.error;
      }
      delayMs = failure.retryAfterMs;
    } else {
      delayMs = computeBackoffMs(attemptNumber, policy, random);
    }
    if (now() + delayMs + policy.minAttemptMs > deadlineAt) {
      throw failure.error;
    }
    try {
      await sleep(delayMs, signal);
    } catch {
      throw abortError(signal);
    }
  }
}
