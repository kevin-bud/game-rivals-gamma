import { test, expect, chromium, type Page } from "@playwright/test";

// End-to-end coverage for the BEACON lane-and-gate round v1: the playable
// round, the win/lose end screen, and the "Another go" rematch.
//
// Determinism: the WS endpoint accepts two test-only query parameters,
//   ?test_seed=<n>     pins the gate sequence (xorshift32 seeded with <n>)
//   ?test_tempo=<ms>   compresses the gate interval (clamped to 200ms+)
// The page forwards anything in its own query string to the WS, so we just
// open `/r/<code>?role=...&test_seed=42&test_tempo=250` to drive a fast,
// reproducible round. These hooks are documented inline in src/index.ts —
// real clients never set them.

const baseURL =
  process.env.PRODUCT_URL ??
  "https://game-rivals-gamma-product.kevin-wilson.workers.dev";

// Seeds chosen empirically against the xorshift32 + bias-against-repeats
// gate generator so the Ship can deterministically win or lose by holding
// a single lane for the whole round. With seed=1 the open lanes form a
// pattern where holding "M" alone yields exactly 3 hits within the first
// few gates → guaranteed loss. The win path simply has the Ship chase
// each gate's open lane via the cue stream, which is what the test does.
const LOSE_SEED = 1;
const FAST_TEMPO_MS = 250;

const createBeacon = async (page: Page, extraQuery: string): Promise<string> => {
  await page.goto(`${baseURL}/`);
  await page.getByTestId("create-button").click();
  await page.waitForURL(/\/r\/[A-Z0-9]{4,6}/);
  const code = (await page.getByTestId("room-code").innerText()).trim();
  // Re-navigate so the test hooks land on the WS connect.
  await page.goto(`${baseURL}/r/${code}?role=A&${extraQuery}`);
  return code;
};

const joinShip = async (page: Page, code: string, extraQuery: string): Promise<void> => {
  await page.goto(`${baseURL}/r/${code}?role=B&${extraQuery}`);
};

test("two clients play through to a Wrecked. ending and can rematch", async () => {
  test.setTimeout(120_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  try {
    const pageA = await contextA.newPage();
    const code = await createBeacon(
      pageA,
      `test_seed=${LOSE_SEED}&test_tempo=${FAST_TEMPO_MS}`,
    );

    const pageB = await contextB.newPage();
    await joinShip(pageB, code, `test_seed=${LOSE_SEED}&test_tempo=${FAST_TEMPO_MS}`);

    // Ready handshake.
    await expect(pageA.getByTestId("presence-text")).toHaveText(
      /Waiting for the Ship to be ready/i,
      { timeout: 10_000 },
    );
    await pageA.getByTestId("ready-button").click();
    await pageB.getByTestId("ready-button").click();

    // Round view appears.
    await expect(pageA.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });

    // The Ship does nothing — sticks to the middle lane. With LOSE_SEED the
    // bias-against-repeats gate stream still produces enough non-middle
    // openings that we hit the limit within the round budget.
    await expect(pageB.getByTestId("result-view")).toBeVisible({ timeout: 30_000 });
    await expect(pageA.getByTestId("result-view")).toBeVisible({ timeout: 5_000 });
    await expect(pageA.getByTestId("result-verdict")).toHaveText(/Wrecked\./, {
      timeout: 5_000,
    });
    await expect(pageB.getByTestId("result-verdict")).toHaveText(/Wrecked\./, {
      timeout: 5_000,
    });
    await expect(pageA.getByTestId("result-subtitle")).toContainText(
      /went down on your watch/i,
    );
    await expect(pageB.getByTestId("result-subtitle")).toContainText(
      /one rock too many/i,
    );

    // Rematch: both press "Another go".
    await pageA.getByTestId("again-button").click();
    await expect(pageA.getByTestId("again-button")).toBeDisabled();
    await expect(pageB.getByTestId("partner-note")).toContainText(
      /The Beacon wants another go/i,
      { timeout: 5_000 },
    );
    await pageB.getByTestId("again-button").click();

    // Countdown then a fresh round view.
    await expect(pageA.getByTestId("countdown-view")).toBeVisible({ timeout: 10_000 });
    await expect(pageA.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });

    // The second round still ends — eventually — even if we just hold still.
    await expect(pageB.getByTestId("result-view")).toBeVisible({ timeout: 45_000 });
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

test("Ship can chase the open lanes to a Saved. ending", async () => {
  test.setTimeout(120_000);

  // Slower tempo so the in-page steering loop reliably lands on each lane
  // before the gate arrives. 600ms / gate × 18 gates ≈ 13s round.
  const winTempo = 600;

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  try {
    const pageA = await contextA.newPage();
    const code = await createBeacon(pageA, `test_seed=${LOSE_SEED}&test_tempo=${winTempo}`);
    const pageB = await contextB.newPage();
    await joinShip(pageB, code, `test_seed=${LOSE_SEED}&test_tempo=${winTempo}`);

    await expect(pageA.getByTestId("presence-text")).toHaveText(
      /Waiting for the Ship to be ready/i,
      { timeout: 10_000 },
    );
    await pageA.getByTestId("ready-button").click();
    await pageB.getByTestId("ready-button").click();
    await expect(pageB.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });

    // The Ship steers using the gate sequence the DO has broadcast. Every
    // 80ms, look for the next gate that hasn't arrived yet (>120ms ahead)
    // and tap that lane. Uses the documented test hook __beaconState.
    await pageB.evaluate(() => {
      const win = window as unknown as {
        __beaconState: {
          phase?: string;
          gates?: { lane: string; arrivesAt: number }[];
          shipLane?: string;
        } | null;
        sendInput: (lane: string) => void;
      };
      let lastTapped = "";
      setInterval(() => {
        const state = win.__beaconState;
        if (!state || state.phase !== "round" || !state.gates) {
          return;
        }
        const now = Date.now();
        // Pick the next gate that's arriving > 80ms from now.
        const next = state.gates.find((g) => g.arrivesAt > now + 80);
        if (!next) {
          return;
        }
        if (next.lane !== lastTapped && next.lane !== state.shipLane) {
          lastTapped = next.lane;
          win.sendInput(next.lane);
        }
      }, 60);
    });

    await expect(pageB.getByTestId("result-view")).toBeVisible({ timeout: 60_000 });
    await expect(pageB.getByTestId("result-verdict")).toHaveText(/Saved\./, {
      timeout: 5_000,
    });
    await expect(pageA.getByTestId("result-verdict")).toHaveText(/Saved\./, {
      timeout: 5_000,
    });
    await expect(pageA.getByTestId("result-subtitle")).toContainText(
      /guided them home/i,
    );
    await expect(pageB.getByTestId("result-subtitle")).toContainText(
      /You made it/i,
    );
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

test("hits indicator updates on both sides during a round", async () => {
  test.setTimeout(60_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  try {
    const pageA = await contextA.newPage();
    const code = await createBeacon(
      pageA,
      `test_seed=${LOSE_SEED}&test_tempo=${FAST_TEMPO_MS}`,
    );

    const pageB = await contextB.newPage();
    await joinShip(pageB, code, `test_seed=${LOSE_SEED}&test_tempo=${FAST_TEMPO_MS}`);

    await expect(pageA.getByTestId("presence-text")).toHaveText(
      /Waiting for the Ship to be ready/i,
      { timeout: 10_000 },
    );
    await pageA.getByTestId("ready-button").click();
    await pageB.getByTestId("ready-button").click();
    await expect(pageB.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });

    // The Ship doesn't move. Wait for both sides to register at least one
    // taken hit pip during the round.
    const seesHit = (page: Page): Promise<void> =>
      expect(
        page.locator("[data-testid='hits'] .hit-pip.taken").first(),
      ).toBeVisible({ timeout: 30_000 });

    await Promise.all([seesHit(pageA), seesHit(pageB)]);
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

test("welcome → countdown → round all fit a 375px portrait viewport", async () => {
  test.setTimeout(60_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext({
    viewport: { width: 375, height: 667 },
  });
  const contextB = await browser.newContext({
    viewport: { width: 375, height: 667 },
  });

  try {
    const pageA = await contextA.newPage();
    const code = await createBeacon(
      pageA,
      `test_seed=${LOSE_SEED}&test_tempo=${FAST_TEMPO_MS}`,
    );
    const pageB = await contextB.newPage();
    await joinShip(pageB, code, `test_seed=${LOSE_SEED}&test_tempo=${FAST_TEMPO_MS}`);

    await expect(pageA.getByTestId("presence-text")).toHaveText(
      /Waiting for the Ship to be ready/i,
      { timeout: 10_000 },
    );
    await pageA.getByTestId("ready-button").click();
    await pageB.getByTestId("ready-button").click();
    await expect(pageA.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });

    // Round view: lane buttons reachable, no horizontal overflow.
    const overflow = await pageA.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const laneBtnBox = await pageA.getByTestId("lane-M").boundingBox();
    expect(laneBtnBox).not.toBeNull();
    if (laneBtnBox !== null) {
      expect(laneBtnBox.height).toBeGreaterThanOrEqual(40);
    }

    // Result screen: also fits.
    await expect(pageA.getByTestId("result-view")).toBeVisible({ timeout: 45_000 });
    const resultOverflow = await pageA.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(resultOverflow).toBeLessThanOrEqual(0);
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});
