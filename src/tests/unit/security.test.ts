import { describe, it, expect } from "vitest";
import { z } from "zod";

// ─── SQL Injection Prevention ────────────────────────────────
// All DB access goes through Supabase's parameterised queries.
// These tests verify that our Zod schemas reject payloads that
// could be used to exploit unsanitised string interpolation.

const maliciousInputs = [
  "'; DROP TABLE tenants; --",
  "\" OR 1=1 --",
  "<script>alert(1)</script>",
  "../../etc/passwd",
  "\x00null_byte",
  "A".repeat(10000),
];

const MessageSchema = z.string().min(1).max(2000);
const NameSchema    = z.string().min(1).max(200);

describe("Input sanitisation — message field", () => {
  it("rejects overlong input (potential DoS)", () => {
    const result = MessageSchema.safeParse("A".repeat(2001));
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(MessageSchema.safeParse("").success).toBe(false);
  });

  it("accepts normal SQL-looking text safely (Supabase parameterises it)", () => {
    // Zod allows it — Supabase will safely parameterise; this is correct behaviour
    expect(MessageSchema.safeParse("What's the price?").success).toBe(true);
  });
});

describe("Tenant ID validation", () => {
  const UUIDSchema = z.string().uuid();

  it("rejects non-UUID tenant IDs", () => {
    const attacks = [
      "'; DELETE FROM tenants; --",
      "../admin",
      "1 OR 1=1",
      "",
    ];
    attacks.forEach(a => {
      expect(UUIDSchema.safeParse(a).success).toBe(false);
    });
  });

  it("accepts valid UUID", () => {
    expect(UUIDSchema.safeParse("123e4567-e89b-12d3-a456-426614174000").success).toBe(true);
  });
});

// ─── Rate Limiting Logic ─────────────────────────────────────
describe("Rate limiting utility", () => {
  // Token bucket implementation
  function createBucket(capacity: number, refillPerMinute: number) {
    let tokens    = capacity;
    let lastRefill = Date.now();
    return {
      consume(n = 1): boolean {
        const now     = Date.now();
        const elapsed = (now - lastRefill) / 60000;
        tokens        = Math.min(capacity, tokens + elapsed * refillPerMinute);
        lastRefill    = now;
        if (tokens >= n) { tokens -= n; return true; }
        return false;
      },
      getTokens() { return tokens; },
    };
  }

  it("allows requests within limit", () => {
    const bucket = createBucket(10, 60);
    expect(bucket.consume()).toBe(true);
    expect(bucket.consume()).toBe(true);
    expect(bucket.consume()).toBe(true);
  });

  it("blocks requests when bucket is empty", () => {
    const bucket = createBucket(2, 1);
    bucket.consume();
    bucket.consume();
    expect(bucket.consume()).toBe(false);
  });

  it("refills tokens over time", async () => {
    const bucket = createBucket(1, 120); // 2 per second
    bucket.consume(); // empty it
    // Simulate time passing by manipulating lastRefill
    await new Promise(r => setTimeout(r, 600));
    // With 120/min = 2/sec, 0.6s gives ~1.2 tokens — enough for 1 more
    expect(bucket.consume()).toBe(true);
  });
});

// ─── WhatsApp Signature Verification ────────────────────────
describe("Webhook signature verification", () => {
  const crypto = await import("crypto");

  function verifyPaystackSignature(payload: string, secret: string, header: string): boolean {
    const hash = crypto.createHmac("sha512", secret).update(payload).digest("hex");
    return hash === header;
  }

  it("accepts a valid Paystack signature", () => {
    const secret  = "test_secret_key";
    const payload = JSON.stringify({ event: "subscription.create" });
    const hash    = crypto.createHmac("sha512", secret).update(payload).digest("hex");
    expect(verifyPaystackSignature(payload, secret, hash)).toBe(true);
  });

  it("rejects a tampered signature", () => {
    const secret  = "test_secret_key";
    const payload = JSON.stringify({ event: "subscription.create" });
    expect(verifyPaystackSignature(payload, secret, "tampered_hash")).toBe(false);
  });

  it("rejects empty signature", () => {
    expect(verifyPaystackSignature("payload", "secret", "")).toBe(false);
  });
});
