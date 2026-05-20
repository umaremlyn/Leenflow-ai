import { test, expect } from "@playwright/test";

// These tests require a seeded test account
// Set TEST_EMAIL and TEST_PASSWORD in your CI environment
test.describe("Dashboard (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    const email    = process.env.TEST_EMAIL    ?? "test@leenco.ai";
    const password = process.env.TEST_PASSWORD ?? "testpassword123";

    await page.goto("/login");
    await page.fill('input[type="email"]',    email);
    await page.fill('input[type="password"]', password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test("dashboard shows stat cards", async ({ page }) => {
    await expect(page.getByText("Conversations")).toBeVisible();
    await expect(page.getByText("Leads captured")).toBeVisible();
    await expect(page.getByText("AI resolution")).toBeVisible();
  });

  test("sidebar navigation works", async ({ page }) => {
    await page.getByRole("link", { name: /leads/i }).click();
    await expect(page).toHaveURL(/\/leads/);
    await expect(page.getByText("Leads")).toBeVisible();
  });

  test("AI assistant page loads", async ({ page }) => {
    await page.getByRole("link", { name: /ai assistant/i }).click();
    await expect(page).toHaveURL(/\/ai-assistant/);
    await expect(page.getByText("Training sources")).toBeVisible();
  });

  test("FAQs page — add FAQ form opens", async ({ page }) => {
    await page.goto("/faqs");
    await page.getByRole("button", { name: /add faq/i }).click();
    await expect(page.getByPlaceholder(/return policy/i)).toBeVisible();
  });

  test("settings page tabs work", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: /billing/i }).click();
    await expect(page.getByText("Starter")).toBeVisible();
    await expect(page.getByText("Growth")).toBeVisible();
  });
});
