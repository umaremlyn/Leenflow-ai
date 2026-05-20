/**
 * In-memory token bucket rate limiter.
 * For production with multiple Vercel instances, swap the store for
 * Redis (e.g. Upstash) so limits are shared across all instances.
 */

interface Bucket {
  tokens:     number;
  lastRefill: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitConfig {
  /** Maximum tokens in the bucket */
  capacity:        number;
  /** Tokens added per minute */
  refillPerMinute: number;
  /** Tokens consumed per request (default 1) */
  cost?:           number;
}

export interface RateLimitResult {
  allowed:    boolean;
  remaining:  number;
  resetInMs:  number;
}

export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const { capacity, refillPerMinute, cost = 1 } = config;
  const now = Date.now();

  let bucket = store.get(key);

  if (!bucket) {
    bucket = { tokens: capacity, lastRefill: now };
    store.set(key, bucket);
  }

  // Refill tokens proportionally to elapsed time
  const elapsed = (now - bucket.lastRefill) / 60_000; // minutes
  bucket.tokens     = Math.min(capacity, bucket.tokens + elapsed * refillPerMinute);
  bucket.lastRefill = now;

  if (bucket.tokens >= cost) {
    bucket.tokens -= cost;
    return {
      allowed:   true,
      remaining: Math.floor(bucket.tokens),
      resetInMs: Math.ceil(((cost - bucket.tokens) / refillPerMinute) * 60_000),
    };
  }

  return {
    allowed:   false,
    remaining: 0,
    resetInMs: Math.ceil(((cost - bucket.tokens) / refillPerMinute) * 60_000),
  };
}

// Preset configs
export const RATE_LIMITS = {
  /** Public chat API — 30 messages per minute per IP */
  chat:    { capacity: 30,  refillPerMinute: 30  } as RateLimitConfig,
  /** Auth endpoints — 10 attempts per minute per IP */
  auth:    { capacity: 10,  refillPerMinute: 10  } as RateLimitConfig,
  /** Train endpoint — 5 retrains per minute per tenant */
  train:   { capacity: 5,   refillPerMinute: 5   } as RateLimitConfig,
  /** General API — 60 requests per minute per user */
  api:     { capacity: 60,  refillPerMinute: 60  } as RateLimitConfig,
  /** Widget (public) — 100 per minute per IP */
  widget:  { capacity: 100, refillPerMinute: 100 } as RateLimitConfig,
} as const;

// Clean up old buckets every 10 minutes (prevents memory leak)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const cutoff = Date.now() - 10 * 60_000;
    for (const [key, bucket] of store.entries()) {
      if (bucket.lastRefill < cutoff) store.delete(key);
    }
  }, 10 * 60_000);
}
