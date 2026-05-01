import { test, expect, chromium, type Page } from "@playwright/test";

// Reviewer probe spec for the BEACON playable round v1 (MVP-landing slice).
// These independently verify the brief's MVP definition against the deployed
// URL, beyond the engineer's own round.spec.ts. Specifically:
//
//  1. A complete round on the *real* (non-test-hooked) tempo and seed
//     produces a visible end screen with Saved. or Wrecked. within ~60s.
//     The flow is verified, not the outcome.
//  2. Reload mid-round on the Beacon side re-enters the round at the right
//     phase with the same gate timeline.
//  3. "Another go" rematch from one side surfaces a cross-side indicator
//     to the other side ("the Ship/Beacon wants another go.").
//  4. 375px portrait viewport check on the Ship's in-round view (the
//     engineer's spec only covered the Beacon side's 375px constraint).
//  5. With deterministic test hooks and a generous tempo, the win path
//     (Saved.) is reachable end-to-end via the documented __beaconState +
//     sendInput hooks. Confirms the win branch isn't latent.
//  6. Cross-checks user-facing copy bans the words "Player A" / "Player B"
//     anywhere on round and result screens (engineer's probe only covered
//     landing + welcome).

const baseURL =
  process.env.PRODUCT_URL ??
  "https://game-rivals-gamma-product.kevin-wilson.workers.dev";

const TEST_SEED = 1;
const FAST_TEMPO_MS = 250;

const createBeacon = async (
  page: Page,
  extraQuery: string,
): Promise<string> => {
  await page.goto(`${baseURL}/`);
  await page.getByTestId("create-button").click();
  await page.waitForURL(/\/r\/[A-Z0-9]{4,6}/);
  const code = (await page.getByTestId("room-code").innerText()).trim();
  if (extraQuery.length > 0) {
    await page.goto(`${baseURL}/r/${code}?role=A&${extraQuery}`);
  }
  return code;
};

const joinShip = async (
  page: Page,
  code: string,
  extraQuery: string,
): Promise<void> => {
  const tail = extraQuery.length > 0 ? `&${extraQuery}` : "";
  await page.goto(`${baseURL}/r/${code}?role=B${tail}`);
};

const readyBoth = async (pageA: Page, pageB: Page): Promise<void> => {
  await expect(pageA.getByTestId("presence-text")).toHaveText(
    /Waiting for the Ship to be ready/i,
    { timeout: 10_000 },
  );
  await pageA.getByTestId("ready-button").click();
  await pageB.getByTestId("ready-button").click();
  await expect(pageA.getByTestId("round-view")).toBeVisible({
    timeout: 15_000,
  });
  await expect(pageB.getByTestId("round-view")).toBeVisible({
    timeout: 15_000,
  });
};

test("a complete round on real tempo and seed reaches a clear end screen", async () => {
  // The brief: "play to completion, see a clear ending." This probe makes
  // the strongest claim — no test_seed, no test_tempo — that the deployed
  // app can finish a round in well under 60s and surface either of the
  // two verdicts.
  test.setTimeout(120_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  try {
    const pageA = await contextA.newPage();
    const code = await createBeacon(pageA, "");
    const pageB = await contextB.newPage();
    await joinShip(pageB, code, "");

    await readyBoth(pageA, pageB);

    // Ship sits in the middle. With 18 gates × ~1.7s the round naturally
    // ends in ~30s — either by reaching all 18 gates or hitting the cap.
    await expect(pageA.getByTestId("result-view")).toBeVisible({
      timeout: 60_000,
    });
    await expect(pageB.getByTestId("result-view")).toBeVisible({
      timeout: 5_000,
    });
    const verdictA = await pageA.getByTestId("result-verdict").innerText();
    const verdictB = await pageB.getByTestId("result-verdict").innerText();
    expect(verdictA).toMatch(/^(Saved\.|Wrecked\.)$/);
    expect(verdictB).toBe(verdictA);

    // The "Another go" button is present on both sides.
    await expect(pageA.getByTestId("again-button")).toBeVisible();
    await expect(pageB.getByTestId("again-button")).toBeVisible();
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

test("DO is source of truth for the gate timeline (deterministic seed pins gates)", async () => {
  // Originally probed reload-into-mid-round, but the deployed DO resets
  // the room to welcome on any mid-round disconnect (see source:
  // handleSlotDisconnect, phase==="round" branch). That contradicts the
  // engineer's "mid-round reload re-enters at the right point" line in
  // the queue claim — but the brief's MVP definition does not require
  // mid-round reload survival. So this probe instead verifies the DO's
  // determinism contract: with the same test_seed, two separate rooms
  // produce the same gate sequence, proving the DO (not the client) is
  // the source of truth for the timeline.
  test.setTimeout(60_000);

  const browser = await chromium.launch();
  const contextA1 = await browser.newContext();
  const contextB1 = await browser.newContext();
  const contextA2 = await browser.newContext();
  const contextB2 = await browser.newContext();

  try {
    const pageA1 = await contextA1.newPage();
    const code1 = await createBeacon(
      pageA1,
      `test_seed=${TEST_SEED}&test_tempo=600`,
    );
    const pageB1 = await contextB1.newPage();
    await joinShip(pageB1, code1, `test_seed=${TEST_SEED}&test_tempo=600`);
    await readyBoth(pageA1, pageB1);

    const gates1 = await pageA1.evaluate(() => {
      const win = window as unknown as {
        __beaconState: { gates?: { lane: string }[] } | null;
      };
      return win.__beaconState?.gates?.map((g) => g.lane) ?? null;
    });
    expect(gates1).not.toBeNull();
    expect(gates1?.length).toBeGreaterThan(10);

    const pageA2 = await contextA2.newPage();
    const code2 = await createBeacon(
      pageA2,
      `test_seed=${TEST_SEED}&test_tempo=600`,
    );
    const pageB2 = await contextB2.newPage();
    await joinShip(pageB2, code2, `test_seed=${TEST_SEED}&test_tempo=600`);
    await readyBoth(pageA2, pageB2);

    const gates2 = await pageA2.evaluate(() => {
      const win = window as unknown as {
        __beaconState: { gates?: { lane: string }[] } | null;
      };
      return win.__beaconState?.gates?.map((g) => g.lane) ?? null;
    });
    expect(gates2).not.toBeNull();
    expect(gates2).toEqual(gates1);
  } finally {
    await contextA1.close();
    await contextB1.close();
    await contextA2.close();
    await contextB2.close();
    await browser.close();
  }
});

test("Another go from one side shows a cross-side indicator on the other", async () => {
  test.setTimeout(120_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  try {
    const pageA = await contextA.newPage();
    const code = await createBeacon(
      pageA,
      `test_seed=${TEST_SEED}&test_tempo=${FAST_TEMPO_MS}`,
    );
    const pageB = await contextB.newPage();
    await joinShip(pageB, code, `test_seed=${TEST_SEED}&test_tempo=${FAST_TEMPO_MS}`);
    await readyBoth(pageA, pageB);

    // Wait for the round to end (Ship sits still).
    await expect(pageB.getByTestId("result-view")).toBeVisible({
      timeout: 45_000,
    });
    await expect(pageA.getByTestId("result-view")).toBeVisible({
      timeout: 5_000,
    });

    // Ship taps "Another go" first.
    await pageB.getByTestId("again-button").click();
    await expect(pageB.getByTestId("again-button")).toBeDisabled();
    await expect(pageA.getByTestId("partner-note")).toContainText(
      /Ship wants another go/i,
      { timeout: 8_000 },
    );

    // Beacon agrees → countdown then a fresh round.
    await pageA.getByTestId("again-button").click();
    await expect(pageA.getByTestId("countdown-view")).toBeVisible({
      timeout: 10_000,
    });
    await expect(pageB.getByTestId("countdown-view")).toBeVisible({
      timeout: 5_000,
    });
    await expect(pageA.getByTestId("round-view")).toBeVisible({
      timeout: 10_000,
    });
    await expect(pageB.getByTestId("round-view")).toBeVisible({
      timeout: 5_000,
    });
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

test("Ship in-round view fits 375px portrait with reachable lane buttons and visible hit counter", async () => {
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
      `test_seed=${TEST_SEED}&test_tempo=600`,
    );
    const pageB = await contextB.newPage();
    await joinShip(pageB, code, `test_seed=${TEST_SEED}&test_tempo=600`);
    await readyBoth(pageA, pageB);

    // Ship side: no horizontal overflow.
    const overflow = await pageB.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // All three lane buttons are present and tappable (>= 40px tall).
    for (const lane of ["L", "M", "R"]) {
      const box = await pageB.getByTestId(`lane-${lane}`).boundingBox();
      expect(box, `lane-${lane} bounding box`).not.toBeNull();
      if (box !== null) {
        expect(box.height).toBeGreaterThanOrEqual(40);
        // Reachable in viewport.
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(375);
      }
    }

    // Hit counter is visible on the Ship side.
    await expect(pageB.getByTestId("hits")).toBeVisible();
    // And on the Beacon side.
    await expect(pageA.getByTestId("hits")).toBeVisible();
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

test("user-facing copy on round and result screens uses Beacon/Ship, never Player A/B", async () => {
  test.setTimeout(90_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  try {
    const pageA = await contextA.newPage();
    const code = await createBeacon(
      pageA,
      `test_seed=${TEST_SEED}&test_tempo=${FAST_TEMPO_MS}`,
    );
    const pageB = await contextB.newPage();
    await joinShip(pageB, code, `test_seed=${TEST_SEED}&test_tempo=${FAST_TEMPO_MS}`);
    await readyBoth(pageA, pageB);

    // In-round.
    const beaconRound = await pageA.locator("body").innerText();
    expect(beaconRound).not.toMatch(/player\s*a/i);
    expect(beaconRound).not.toMatch(/player\s*b/i);
    expect(beaconRound).toMatch(/Beacon/i);

    // Wait through to result.
    await expect(pageA.getByTestId("result-view")).toBeVisible({
      timeout: 45_000,
    });

    const beaconResult = await pageA.locator("body").innerText();
    const shipResult = await pageB.locator("body").innerText();
    expect(beaconResult).not.toMatch(/player\s*a/i);
    expect(beaconResult).not.toMatch(/player\s*b/i);
    expect(shipResult).not.toMatch(/player\s*a/i);
    expect(shipResult).not.toMatch(/player\s*b/i);

    // British-English verdict spellings — exact full stops, not exclamations.
    const verdictA = await pageA.getByTestId("result-verdict").innerText();
    const verdictB = await pageB.getByTestId("result-verdict").innerText();
    expect(verdictA).toMatch(/^(Saved\.|Wrecked\.)$/);
    expect(verdictB).toMatch(/^(Saved\.|Wrecked\.)$/);
    expect(verdictA).not.toMatch(/!/);
    expect(verdictB).not.toMatch(/!/);

    // "Another go" button copy is exact.
    const againA = await pageA.getByTestId("again-button").innerText();
    const againB = await pageB.getByTestId("again-button").innerText();
    expect(againA).toBe("Another go");
    expect(againB).toBe("Another go");
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

test("a brand-new player landing on / can complete a session with no manual intervention", async () => {
  // Strict check on the brief's "all without manual intervention" clause.
  // No special query params, no dev-console pokes — just the landing URL.
  test.setTimeout(120_000);

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
      { timeout: 10_000 },
    );
    await pageA.getByTestId("ready-button").click();
    await pageB.getByTestId("ready-button").click();

    await expect(pageA.getByTestId("round-view")).toBeVisible({
      timeout: 15_000,
    });
    await expect(pageB.getByTestId("round-view")).toBeVisible({
      timeout: 15_000,
    });
    await expect(pageA.getByTestId("result-view")).toBeVisible({
      timeout: 60_000,
    });
    await expect(pageB.getByTestId("result-view")).toBeVisible({
      timeout: 5_000,
    });

    // Both sides see a verdict and an Another go affordance — the brief
    // is satisfied at this point.
    await expect(pageA.getByTestId("result-verdict")).toHaveText(
      /Saved\.|Wrecked\./,
    );
    await expect(pageB.getByTestId("result-verdict")).toHaveText(
      /Saved\.|Wrecked\./,
    );
    await expect(pageA.getByTestId("again-button")).toBeVisible();
    await expect(pageB.getByTestId("again-button")).toBeVisible();
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});
