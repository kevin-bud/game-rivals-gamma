import { test, expect, chromium } from "@playwright/test";

// Drive two browser contexts against the deployed URL through the BEACON
// handshake: role-named welcome → ready handshake → synced 3-2-1 countdown
// → role-specific placeholder round view.

const baseURL =
  process.env.PRODUCT_URL ??
  "https://game-rivals-gamma-product.kevin-wilson.workers.dev";

test("two contexts land on role-named welcome screens", async () => {
  test.setTimeout(60_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  try {
    const pageA = await contextA.newPage();
    await pageA.goto(`${baseURL}/`);

    await pageA.getByTestId("create-button").click();
    await pageA.waitForURL(/\/r\/[A-Z0-9]{4,6}/);

    // The Beacon (slot A) sees the Beacon framing.
    await expect(pageA.getByTestId("role-title")).toHaveText(/You are the Beacon\./);
    await expect(pageA.getByTestId("role-body")).toContainText(/Flash signals/);

    const code = (await pageA.getByTestId("room-code").innerText()).trim();
    expect(code).toMatch(/^[A-Z0-9]{4,6}$/);

    // While A is alone, the indicator should mention waiting for the Ship.
    await expect(pageA.getByTestId("presence-text")).toHaveText(/Waiting for the Ship/i, {
      timeout: 5_000,
    });

    const pageB = await contextB.newPage();
    await pageB.goto(`${baseURL}/`);
    await pageB.getByTestId("join-input").fill(code);
    await pageB.getByTestId("join-button").click();
    await pageB.waitForURL(/\/r\/[A-Z0-9]{4,6}/);

    // The Ship (slot B) sees the Ship framing.
    await expect(pageB.getByTestId("role-title")).toHaveText(/You are the Ship\./);
    await expect(pageB.getByTestId("role-body")).toContainText(/sail through fog/);

    // Both sides should see "waiting for the other to be ready" once
    // both are connected but neither has pressed ready.
    await expect(pageA.getByTestId("presence-text")).toHaveText(
      /Waiting for the Ship to be ready/i,
      { timeout: 5_000 },
    );
    await expect(pageB.getByTestId("presence-text")).toHaveText(
      /Waiting for the Beacon to be ready/i,
      { timeout: 5_000 },
    );

    // The room code is still visible and copyable on both sides.
    await expect(pageA.getByTestId("room-code")).toHaveText(code);
    await expect(pageB.getByTestId("room-code")).toHaveText(code);
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

test("ready handshake leads through countdown to role-specific round view", async () => {
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

    // Wait for the cross-presence to settle.
    await expect(pageA.getByTestId("presence-text")).toHaveText(
      /Waiting for the Ship to be ready/i,
      { timeout: 5_000 },
    );

    // A presses Ready: A's button disables, B's indicator flips.
    await pageA.getByTestId("ready-button").click();
    await expect(pageA.getByTestId("ready-button")).toBeDisabled();
    await expect(pageA.getByTestId("ready-button")).toHaveText(/Waiting/i);
    await expect(pageB.getByTestId("presence-text")).toHaveText(/The Beacon is ready/i, {
      timeout: 5_000,
    });

    // B presses Ready: countdown begins on both sides.
    await pageB.getByTestId("ready-button").click();
    await expect(pageA.getByTestId("countdown-view")).toBeVisible({ timeout: 5_000 });
    await expect(pageB.getByTestId("countdown-view")).toBeVisible({ timeout: 5_000 });

    // The countdown should walk through 3 → 2 → 1.
    await expect(pageA.getByTestId("countdown-number")).toHaveText("3", {
      timeout: 2_000,
    });
    await expect(pageA.getByTestId("countdown-number")).toHaveText("2", {
      timeout: 2_000,
    });
    await expect(pageA.getByTestId("countdown-number")).toHaveText("1", {
      timeout: 2_000,
    });

    // Both sides land on the role-specific round view with the lane-and-gate
    // controls in place. The HUD shows which role and the current room code.
    await expect(pageA.getByTestId("round-view")).toBeVisible({ timeout: 5_000 });
    await expect(pageB.getByTestId("round-view")).toBeVisible({ timeout: 5_000 });
    await expect(pageA.getByTestId("round-role-tag")).toContainText("Beacon");
    await expect(pageB.getByTestId("round-role-tag")).toContainText("Ship");
    await expect(pageA.getByTestId("round-role-tag")).toContainText(code);
    await expect(pageB.getByTestId("round-role-tag")).toContainText(code);
    // Lane buttons are present on both sides.
    await expect(pageA.getByTestId("lane-L")).toBeVisible();
    await expect(pageB.getByTestId("lane-L")).toBeVisible();
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

test("disconnect on welcome flips the other side's ready indicator back to waiting", async () => {
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

    // B presses ready and then disconnects. A should see the indicator
    // flip from "the Ship is ready" back to "waiting for the Ship to join".
    await pageB.getByTestId("ready-button").click();
    await expect(pageA.getByTestId("presence-text")).toHaveText(/The Ship is ready/i, {
      timeout: 5_000,
    });

    await pageB.close();
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

test("joining a non-existent room shows a clear message", async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto(`${baseURL}/`);
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
    // Wait for B to actually be connected before the third one tries.
    await expect(pageB.getByTestId("role-title")).toHaveText(/You are the Ship\./);
    await expect(pageA.getByTestId("presence-text")).toHaveText(
      /Waiting for the Ship to be ready/i,
      { timeout: 5_000 },
    );

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
