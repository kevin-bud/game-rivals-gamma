import { test, expect } from "@playwright/test";

test("returns 200 and contains 'coming soon'", async ({ request, page }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);

  await page.goto("/");
  await expect(page.locator("body")).toContainText("coming soon");
});
