import { expect, test } from "@playwright/test";
import { demoPassword } from "../src/demoAccounts.js";

const sizes = [
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1366, 768],
  [1440, 900],
];

const routes = ["/", "/community", "/finance", "/concerns", "/more"];

test("demo routes stay inside the viewport", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill("resident@demo.sabha.app");
  await page.getByLabel("Password").fill(demoPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /88\.9% collected/ })).toBeVisible();

  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("h1")).toHaveCount(1);
      const fit = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(fit.scrollWidth, `${width}x${height} ${route}`).toBeLessThanOrEqual(fit.clientWidth + 1);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("link", { name: "Finance" }).click();
  await expect(page).toHaveURL(/\/finance$/);
  await expect(page.getByRole("heading", { name: "Finance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /collected/ })).toHaveCount(0);
});
