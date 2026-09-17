export type RateLimitRule = {
  limit: number;
  windowMs: number;
};

export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export type RateLimiter = {
  consume(keys: readonly { scope: string; id: string; rule: RateLimitRule }[], nowMs: number): RateLimitDecision;
};

export function createSlidingWindowRateLimiter({ maxTrackedKeys = 10000 }: { maxTrackedKeys?: number } = {}): RateLimiter {
  const hits = new Map<string, number[]>();

  const prune = (nowMs: number, longestWindowMs: number) => {
    if (hits.size <= maxTrackedKeys) {
      return;
    }
    for (const [key, timestamps] of hits) {
      if (timestamps.length === 0 || nowMs - timestamps[timestamps.length - 1] > longestWindowMs) {
        hits.delete(key);
      }
    }
    while (hits.size > maxTrackedKeys) {
      const oldest = hits.keys().next();
      if (oldest.done) {
        break;
      }
      hits.delete(oldest.value);
    }
  };

  return {
    consume: (keys, nowMs) => {
      let retryAfterMs = 0;
      const recent = keys.map(({ scope, id, rule }) => {
        const key = `${scope}:${id}`;
        const timestamps = (hits.get(key) ?? []).filter((time) => nowMs - time < rule.windowMs);
        if (timestamps.length >= rule.limit) {
          retryAfterMs = Math.max(retryAfterMs, timestamps[0] + rule.windowMs - nowMs);
        }
        return { key, timestamps };
      });
      if (retryAfterMs > 0) {
        for (const { key, timestamps } of recent) {
          hits.set(key, timestamps);
        }
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
      }
      for (const { key, timestamps } of recent) {
        hits.delete(key);
        hits.set(key, [...timestamps, nowMs]);
      }
      prune(nowMs, Math.max(...keys.map((entry) => entry.rule.windowMs)));
      return { allowed: true };
    },
  };
}
