import { test, expect, chromium, devices } from "@playwright/test";

// Reviewer probe spec for the BEACON handshake slice. These exercises go
// beyond the engineer's spec to independently verify behaviours the
// orchestrator flagged: countdown sync between clients, disconnect during
// countdown, reload-into-correct-state, mobile-portrait viability, and the
// language ban on "Player A / Player B" in user-facing copy.

const baseURL =
  process.env.PRODUCT_URL ??
  "https://game-rivals-gamma-product.kevin-wilson.workers.dev";

test("user-facing copy never says Player A or Player B", async ({ page }) => {
  test.setTimeout(30_000);

  await page.goto(`${baseURL}/`);
  const landingBody = await page.locator("body").innerText();
  expect(landingBody).not.toMatch(/player\s*a/i);
  expect(landingBody).not.toMatch(/player\s*b/i);

  // Create a room as A (Beacon) and look at the welcome card text.
  await page.getByTestId("create-button").click();
  await page.waitForURL(/\/r\/[A-Z0-9]{4,6}/);
  const beaconBody = await page.locator("body").innerText();
  expect(beaconBody).not.toMatch(/player\s*a/i);
  expect(beaconBody).not.toMatch(/player\s*b/i);
  expect(beaconBody).toMatch(/Beacon/);
});

test("both clients hit the round view on the same beat (sync ~within 1s)", async () => {
  test.setTimeout(60_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

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
    await pageB.waitForURL(/\/r\/[A-Z0-9]{4,6}/);

    await expect(pageA.getByTestId("presence-text")).toHaveText(
      /Waiting for the Ship to be ready/i,
      { timeout: 5_000 },
    );

    await pageA.getByTestId("ready-button").click();
    await pageB.getByTestId("ready-button").click();

    // Race both pages to the round view and timestamp each side.
    const [aRoundAt, bRoundAt] = await Promise.all([
      pageA
        .getByTestId("round-view")
        .waitFor({ state: "visible", timeout: 8_000 })
        .then(() => Date.now()),
      pageB
        .getByTestId("round-view")
        .waitFor({ state: "visible", timeout: 8_000 })
        .then(() => Date.now()),
    ]);

    const skewMs = Math.abs(aRoundAt - bRoundAt);
    // The orchestrator said don't fail on the engineer's <150ms claim — but
    // both clients should still land within ~1s of each other if the DO is
    // really driving everything off a shared start time.
    expect(skewMs).toBeLessThan(1_000);
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

test("disconnect during countdown returns the survivor to the welcome screen", async () => {
  test.setTimeout(60_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

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
    await pageB.waitForURL(/\/r\/[A-Z0-9]{4,6}/);

    await expect(pageA.getByTestId("presence-text")).toHaveText(
      /Waiting for the Ship to be ready/i,
      { timeout: 5_000 },
    );

    await pageA.getByTestId("ready-button").click();
    await pageB.getByTestId("ready-button").click();

    // Wait for the countdown view to appear on A, then close B mid-flight.
    await expect(pageA.getByTestId("countdown-view")).toBeVisible({
      timeout: 5_000,
    });
    await pageB.close();

    // A should be returned to the welcome screen with the role title back
    // and the ready button re-enabled.
    await expect(pageA.getByTestId("role-title")).toBeVisible({
      timeout: 5_000,
    });
    await expect(pageA.getByTestId("ready-button")).toBeEnabled({
      timeout: 5_000,
    });
    await expect(pageA.getByTestId("presence-text")).toHaveText(
      /Waiting for the Ship to join/i,
      { timeout: 5_000 },
    );
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

test("reload mid-welcome lands back on the same role and same room", async () => {
  test.setTimeout(45_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

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
    await pageB.waitForURL(/\/r\/[A-Z0-9]{4,6}/);

    await expect(pageB.getByTestId("role-title")).toHaveText(/You are the Ship\./);

    // Reload the Ship's page — should re-enter as the Ship in the same room.
    await pageB.reload();
    await expect(pageB.getByTestId("role-title")).toHaveText(/You are the Ship\./, {
      timeout: 10_000,
    });
    await expect(pageB.getByTestId("room-code")).toHaveText(code);
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

test("welcome and round views fit in a 375px portrait viewport", async () => {
  test.setTimeout(60_000);

  const browser = await chromium.launch();
  const iphone = devices["iPhone SE"] ?? { viewport: { width: 375, height: 667 } };
  const contextA = await browser.newContext({ ...iphone });
  const contextB = await browser.newContext({ ...iphone });

  try {
    const pageA = await contextA.newPage();
    await pageA.goto(`${baseURL}/`);
    await pageA.getByTestId("create-button").click();
    await pageA.waitForURL(/\/r\/[A-Z0-9]{4,6}/);
    const code = (await pageA.getByTestId("room-code").innerText()).trim();

    // No horizontal overflow on the welcome screen.
    const welcomeOverflow = await pageA.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(welcomeOverflow).toBeLessThanOrEqual(0);

    // The ready button should be reachably tall (>= 40px).
    const readyBox = await pageA.getByTestId("ready-button").boundingBox();
    expect(readyBox).not.toBeNull();
    if (readyBox !== null) {
      expect(readyBox.height).toBeGreaterThanOrEqual(40);
    }

    const pageB = await contextB.newPage();
    await pageB.goto(`${baseURL}/`);
    await pageB.getByTestId("join-input").fill(code);
    await pageB.getByTestId("join-button").click();
    await pageB.waitForURL(/\/r\/[A-Z0-9]{4,6}/);

    // Wait for cross-presence to settle before pressing Ready, so the
    // handshake is reliably observable even on a 375px context.
    await expect(pageA.getByTestId("presence-text")).toHaveText(
      /Waiting for the Ship to be ready/i,
      { timeout: 5_000 },
    );
    await expect(pageB.getByTestId("presence-text")).toHaveText(
      /Waiting for the Beacon to be ready/i,
      { timeout: 5_000 },
    );

    await pageA.getByTestId("ready-button").click();
    await pageB.getByTestId("ready-button").click();

    await expect(pageA.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });
    const roundOverflow = await pageA.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(roundOverflow).toBeLessThanOrEqual(0);
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});
