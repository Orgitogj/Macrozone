import { createSlidingWindowRateLimiter, type RateLimiter } from './rateLimiter.ts';

export type DailyBudgetDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export type DailyBudget = {
  consume(limit: number, nowMs: number): DailyBudgetDecision;
};

export type UsageStore = {
  readonly kind: 'memory';
  readonly sharedAcrossInstances: false;
  readonly survivesRestart: false;
  readonly rateLimiter: RateLimiter;
  readonly dailyBudget: DailyBudget;
};

export type ConcurrencyLimiter = {
  tryAcquire(): (() => void) | null;
  inFlight(): number;
};

const DAY_MS = 86_400_000;

export function createInMemoryDailyBudget(): DailyBudget {
  let day = -1;
  let used = 0;
  return {
    consume: (limit, nowMs) => {
      const currentDay = Math.floor(nowMs / DAY_MS);
      if (currentDay !== day) {
        day = currentDay;
        used = 0;
      }
      if (used >= limit) {
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(((currentDay + 1) * DAY_MS - nowMs) / 1000)) };
      }
      used += 1;
      return { allowed: true };
    },
  };
}

export function createInMemoryUsageStore(): UsageStore {
  return {
    kind: 'memory',
    sharedAcrossInstances: false,
    survivesRestart: false,
    rateLimiter: createSlidingWindowRateLimiter(),
    dailyBudget: createInMemoryDailyBudget(),
  };
}

export function createConcurrencyLimiter(maxConcurrent: number): ConcurrencyLimiter {
  let active = 0;
  return {
    tryAcquire: () => {
      if (active >= maxConcurrent) {
        return null;
      }
      active += 1;
      let released = false;
      return () => {
        if (!released) {
          released = true;
          active -= 1;
        }
      };
    },
    inFlight: () => active,
  };
}
