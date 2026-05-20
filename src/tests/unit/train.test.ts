import { describe, it, expect, vi } from "vitest";
import { trainTenant } from "@/lib/ai/train";

describe("trainTenant", () => {
  it("returns chunksIndexed and errors array", async () => {
    const result = await trainTenant("ten-001");
    expect(typeof result.chunksIndexed).toBe("number");
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it("chunksIndexed is non-negative", async () => {
    const result = await trainTenant("ten-001");
    expect(result.chunksIndexed).toBeGreaterThanOrEqual(0);
  });

  it("handles empty knowledge base gracefully", async () => {
    const result = await trainTenant("empty-tenant");
    expect(result.errors).toHaveLength(0);
    expect(result.chunksIndexed).toBe(0);
  });
});

describe("text chunking (via trainTenant internals)", () => {
  it("completes without throwing for a normal tenant", async () => {
    await expect(trainTenant("ten-001")).resolves.not.toThrow();
  });
});
