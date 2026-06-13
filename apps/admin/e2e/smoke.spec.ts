import { test, expect } from "@playwright/test";

test("sign-in page loads", async ({ page }) => {
  await page.goto("/#/auth/sign-in");
  await expect(page.getByRole("heading", { name: "CurvvTech Admin" })).toBeVisible();
});
