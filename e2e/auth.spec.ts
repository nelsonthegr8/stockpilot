import { test, expect } from "@playwright/test";

test.describe("Login flow", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("wrong@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });

  test("successful login redirects to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@stockpilot.dev");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("Create SKU + print label", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@stockpilot.dev");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test("can navigate to products page", async ({ page }) => {
    await page.goto("/dashboard/products");
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  });

  test("can navigate to new product form", async ({ page }) => {
    await page.goto("/dashboard/products/new");
    await expect(page.getByRole("heading", { name: /New Product|Create Product/ })).toBeVisible();
  });
});

test.describe("Receive printed parts flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@stockpilot.dev");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test("can navigate to receive printed parts page", async ({ page }) => {
    await page.goto("/dashboard/inventory/receive/printed-parts");
    await expect(page.getByRole("heading", { name: /Receive Printed Parts/ })).toBeVisible();
  });
});
