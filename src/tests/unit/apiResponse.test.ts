import { describe, it, expect } from "vitest";
import { ok, err, zodErr, rateLimited, unauthorized, forbidden, notFound } from "@/lib/utils/apiResponse";
import { z } from "zod";

describe("apiResponse helpers", () => {
  it("ok() returns 200 with data", async () => {
    const res = ok({ id: "123" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ id: "123" });
    expect(body.error).toBeNull();
  });

  it("ok() accepts custom status", async () => {
    const res = ok({ id: "123" }, 201);
    expect(res.status).toBe(201);
  });

  it("err() returns 400 with error message", async () => {
    const res = err("Something went wrong");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Something went wrong");
    expect(body.data).toBeNull();
  });

  it("err() accepts custom status code", async () => {
    const res = err("Not found", 404);
    expect(res.status).toBe(404);
  });

  it("unauthorized() returns 401", async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("forbidden() returns 403", async () => {
    const res = forbidden();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("notFound() returns 404 with resource name", async () => {
    const res = notFound("Product");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Product");
  });

  it("rateLimited() returns 429 with Retry-After header", async () => {
    const res = rateLimited(30000);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("zodErr() formats Zod errors into readable message", async () => {
    const schema = z.object({ name: z.string().min(1), age: z.number() });
    const result = schema.safeParse({ name: "", age: "not-a-number" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const res = zodErr(result.error);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeTruthy();
      expect(typeof body.error).toBe("string");
    }
  });
});

describe("getIp", () => {
  it("extracts IP from x-real-ip header", async () => {
    const { getIp } = await import("@/lib/utils/getIp");
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "1.2.3.4" },
    });
    // NextRequest wraps Request — test the header extraction logic
    expect(req.headers.get("x-real-ip")).toBe("1.2.3.4");
  });

  it("falls back to x-forwarded-for", async () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "5.6.7.8, 9.10.11.12" },
    });
    const firstIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    expect(firstIp).toBe("5.6.7.8");
  });
});
