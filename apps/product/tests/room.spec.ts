import { test, expect, chromium } from "@playwright/test";

// Drive two browser contexts against the deployed URL: A creates, B joins,
// both observe each other as connected within ~1s.

const baseURL =
  process.env.PRODUCT_URL ??
  "https://game-rivals-gamma-product.kevin-wilson.workers.dev";

test("two contexts can find each other in a room", async () => {
  test.setTimeout(60_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  try {
    const pageA = await contextA.newPage();
    await pageA.goto(`${baseURL}/`);

    // Create the room from context A.
    await pageA.getByTestId("create-button").click();
    await pageA.waitForURL(/\/r\/[A-Z0-9]{4,6}/);

    const roleA = await pageA.getByTestId("role").innerText();
    expect(roleA).toContain("Player A");

    const code = (await pageA.getByTestId("room-code").innerText()).trim();
    expect(code).toMatch(/^[A-Z0-9]{4,6}$/);

    // While A is alone, presence text should remain "waiting…".
    await expect(pageA.getByTestId("presence-text")).toHaveText(/waiting/i, {
      timeout: 5_000,
    });

    // Context B joins by code.
    const pageB = await contextB.newPage();
    await pageB.goto(`${baseURL}/`);
    await pageB.getByTestId("join-input").fill(code);
    await pageB.getByTestId("join-button").click();
    await pageB.waitForURL(/\/r\/[A-Z0-9]{4,6}/);

    const roleB = await pageB.getByTestId("role").innerText();
    expect(roleB).toContain("Player B");

    // Both clients see each other as connected within ~5s
    // (target is ~1s; allow margin for cold starts on the deployed worker).
    await expect(pageB.getByTestId("presence-text")).toHaveText(/connected/i, {
      timeout: 5_000,
    });
    await expect(pageA.getByTestId("presence-text")).toHaveText(/connected/i, {
      timeout: 5_000,
    });

    // When B closes, A should flip back to waiting within ~5s.
    await pageB.close();
    await expect(pageA.getByTestId("presence-text")).toHaveText(/waiting/i, {
      timeout: 5_000,
    });
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

test("joining a non-existent room shows a clear message", async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto(`${baseURL}/`);
  // Use a code that's definitely not in use — random unambiguous chars.
  await page.getByTestId("join-input").fill("ZZZZZ");
  await page.getByTestId("join-button").click();
  await expect(page.getByTestId("error-message")).toContainText(/doesn't exist/i);
});

test("joining a full room shows a clear message", async () => {
  test.setTimeout(60_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const contextC = await browser.newContext();

  try {
    const pageA = await contextA.newPage();
    await pageA.goto(`${baseURL}/`);
    await pageA.getByTestId("create-button").click();
    await pageA.waitForURL(/\/r\/[A-Z0-9]{4,6}/);
    const code = (await pageA.getByTestId("room-code").innerText()).trim();

    const pageB = await contextB.newPage();
    await pageB.goto(`${baseURL}/`);
    await pageB.getByTestId("join-input").fill(code);
    await pageB.getByTestId("join-button").click();
    await expect(pageB.getByTestId("presence-text")).toHaveText(/connected/i, {
      timeout: 5_000,
    });

    // Third context tries to join — server-side probe should reject.
    const pageC = await contextC.newPage();
    await pageC.goto(`${baseURL}/`);
    await pageC.getByTestId("join-input").fill(code);
    await pageC.getByTestId("join-button").click();
    await expect(pageC.getByTestId("error-message")).toContainText(/full/i);
  } finally {
    await contextA.close();
    await contextB.close();
    await contextC.close();
    await browser.close();
  }
});
