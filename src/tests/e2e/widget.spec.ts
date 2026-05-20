import { test, expect } from "@playwright/test";

test.describe("Embeddable widget", () => {
  test("widget JS file is publicly accessible", async ({ page }) => {
    const response = await page.goto("/widget/leenco.js");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["content-type"]).toContain("javascript");
  });

  test("chat API returns 400 for invalid tenant", async ({ page }) => {
    const response = await page.request.post("/api/assistant/chat", {
      data: {
        tenantId: "00000000-0000-0000-0000-000000000000",
        message:  "Hello",
        channel:  "website",
      },
    });
    // Either 404 (tenant not found) or valid error response
    expect([400, 404, 429]).toContain(response.status());
  });

  test("chat API rejects missing tenantId", async ({ page }) => {
    const response = await page.request.post("/api/assistant/chat", {
      data: { message: "Hello", channel: "website" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test("chat API rejects empty message", async ({ page }) => {
    const response = await page.request.post("/api/assistant/chat", {
      data: {
        tenantId: "123e4567-e89b-12d3-a456-426614174000",
        message:  "",
        channel:  "website",
      },
    });
    expect(response.status()).toBe(400);
  });
});
