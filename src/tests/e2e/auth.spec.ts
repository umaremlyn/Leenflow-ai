import { test, expect } from "@playwright/test";

test.describe("Authentication flows", () => {
  test("login page loads correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("register page loads correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Create your account")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("login page has link to register", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /create one/i })).toBeVisible();
  });

  test("register page has link to login", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test("unauthenticated users are redirected from /dashboard to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]',    "nobody@nowhere.com");
    await page.fill('input[type="password"]', "wrongpassword123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|incorrect|wrong/i)).toBeVisible({ timeout: 5000 });
  });

  test("register form step 1 → step 2 progression", async ({ page }) => {
    await page.goto("/register");
    await page.fill('input[placeholder="Adunni Tunde"]',    "Test User");
    await page.fill('input[type="email"]',                   "test@example.com");
    await page.fill('input[type="password"]',                "securepassword123");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText("Your business")).toBeVisible();
  });
});
