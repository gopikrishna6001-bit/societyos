import { expect, test } from "@playwright/test";

test("legacy login rejects a short phone number", async ({ page }) => {
  await page.goto("/legacy");
  await page.getByPlaceholder("9XXXXXXXXX").fill("123");
  await page.getByRole("button", { name: "Continue →" }).click();
  await expect(page.getByText("Enter a valid 10-digit phone number")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue →" })).toBeEnabled();
});

test("legacy login reports a failure and stays usable", async ({ page }) => {
  await page.goto("/legacy");
  await page.getByPlaceholder("9XXXXXXXXX").fill("9876543210");
  await page.getByRole("button", { name: "Continue →" }).click();
  await expect(page.getByText(/Authentication is not configured|Could not reach the server|took too long/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue →" })).toBeEnabled();
});

test("the platform does not show sample fund balances", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Every Rupee. Every Decision. Every Concern." })).toBeVisible();
  await expect(page.getByText(/Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY|Sign in with the email/)).toBeVisible();
  await expect(page.getByText("₹2,84,500")).toHaveCount(0);
  const signIn = page.getByRole("button", { name: "Sign in" });
  if (await signIn.count()) {
    await page.getByLabel("Email").fill("resident@example.com");
    await page.getByLabel("Password").fill("not-a-real-password");
    await signIn.click();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  }
});

test("the configuration screen stays readable on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Every Rupee. Every Decision. Every Concern." })).toBeVisible();
});
