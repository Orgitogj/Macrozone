export type RateDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export type RequestRateLimiter = {
  tryAcquire(nowMs: number): RateDecision;
  blockUntil(untilMs: number): void;
};

export function createRequestRateLimiter({ maxRequests, windowMs }: { maxRequests: number; windowMs: number }): RequestRateLimiter {
  let timestamps: number[] = [];
  let blockedUntil = 0;
  return {
    tryAcquire: (nowMs) => {
      if (nowMs < blockedUntil) {
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((blockedUntil - nowMs) / 1000)) };
      }
      timestamps = timestamps.filter((time) => nowMs - time < windowMs);
      if (timestamps.length >= maxRequests) {
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((timestamps[0] + windowMs - nowMs) / 1000)) };
      }
      timestamps.push(nowMs);
      return { allowed: true };
    },
    blockUntil: (untilMs) => {
      blockedUntil = Math.max(blockedUntil, untilMs);
    },
  };
}

export function parseRetryAfter(value: string | null, nowMs: number, maxSeconds: number): number | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (/^[0-9]{1,7}$/.test(trimmed)) {
    return Math.min(Number(trimmed), maxSeconds);
  }
  if (!/^[A-Za-z]{3}, [0-9]{2} [A-Za-z]{3} [0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2} GMT$/.test(trimmed)) {
    return null;
  }
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) {
    return null;
  }
  return Math.min(Math.max(0, Math.ceil((date - nowMs) / 1000)), maxSeconds);
}
