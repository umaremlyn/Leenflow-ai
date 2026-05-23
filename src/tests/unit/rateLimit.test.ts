import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit, RATE_LIMITS } from "@/lib/utils/rateLimit";

describe("rateLimit — token bucket", () => {
  beforeEach(() => {
    // Clear module state between tests by using unique keys
  });

  it("allows requests within capacity", () => {
    const key = `test:${Date.now()}:1`;
    const r1 = rateLimit(key, { capacity: 5, refillPerMinute: 60 });
    const r2 = rateLimit(key, { capacity: 5, refillPerMinute: 60 });
    const r3 = rateLimit(key, { capacity: 5, refillPerMinute: 60 });
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
  });

  it("blocks when bucket is exhausted", () => {
    const key = `test:${Date.now()}:2`;
    const cfg = { capacity: 2, refillPerMinute: 1 };
    rateLimit(key, cfg); // consume 1
    rateLimit(key, cfg); // consume 2
    const r3 = rateLimit(key, cfg); // should be blocked
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it("returns remaining token count", () => {
    const key = `test:${Date.now()}:3`;
    const cfg = { capacity: 10, refillPerMinute: 60 };
    rateLimit(key, cfg); // 9 remaining
    const r = rateLimit(key, cfg); // 8 remaining
    expect(r.remaining).toBe(8);
  });

  it("returns resetInMs when blocked", () => {
    const key = `test:${Date.now()}:4`;
    const cfg = { capacity: 1, refillPerMinute: 1 };
    rateLimit(key, cfg); // exhaust
    const r = rateLimit(key, cfg);
    expect(r.allowed).toBe(false);
    expect(r.resetInMs).toBeGreaterThan(0);
  });

  it("different keys are independent", () => {
    const cfg = { capacity: 1, refillPerMinute: 1 };
    const keyA = `test:${Date.now()}:keyA`;
    const keyB = `test:${Date.now()}:keyB`;
    rateLimit(keyA, cfg); // exhaust A
    const rB = rateLimit(keyB, cfg); // B should still be fine
    expect(rB.allowed).toBe(true);
  });

  it("RATE_LIMITS presets are defined", () => {
    expect(RATE_LIMITS.chat.capacity).toBeGreaterThan(0);
    expect(RATE_LIMITS.train.capacity).toBeGreaterThan(0);
    expect(RATE_LIMITS.auth.capacity).toBeGreaterThan(0);
    expect(RATE_LIMITS.api.capacity).toBeGreaterThan(0);
  });
});

describe("rateLimit — cost parameter", () => {
  it("respects cost > 1", () => {
    const key = `test:${Date.now()}:cost`;
    const cfg = { capacity: 10, refillPerMinute: 60, cost: 5 };
    const r1 = rateLimit(key, cfg); // consumes 5 → 5 left
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(5);
    const r2 = rateLimit(key, cfg); // consumes 5 → 0 left
    expect(r2.allowed).toBe(true);
    const r3 = rateLimit(key, cfg); // 0 left — blocked
    expect(r3.allowed).toBe(false);
  });
});
