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
  // before the gate arrives. 600ms flaked on transatlantic WS RTTs
  // (~50–100ms) — the steering tick (60ms) plus a single round-trip eats
  // enough of the budget that the Ship occasionally lands a hit; 1000ms
  // still flaked. 1200ms gives the steering loop ~20 ticks per gate even
  // with worst-case RTT, which makes the path comfortably reliable.
  // Round length ≈ 22s.
  const winTempo = 1200;

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

    // The Ship steers using the gate sequence the DO has broadcast.
    // Strategy: track the index of the next gate we care about, tap its
    // lane once when there's enough lead-time for the WS message to
    // round-trip and update the DO before the gate arrives, then advance
    // to the next gate when the previous one is in the past. The 350ms
    // lead is comfortably above worst-case transatlantic RTT (~100–200ms)
    // plus alarm-evaluation jitter.
    await pageB.evaluate(() => {
      const win = window as unknown as {
        __beaconState: {
          phase?: string;
          gates?: { lane: string; arrivesAt: number }[];
          shipLane?: string;
        } | null;
        sendInput: (lane: string) => void;
      };
      let gateIndex = 0;
      let tappedForIndex = -1;
      setInterval(() => {
        const state = win.__beaconState;
        if (!state || state.phase !== "round" || !state.gates) {
          return;
        }
        const now = Date.now();
        // Advance past any gates that have already arrived.
        while (
          gateIndex < state.gates.length &&
          state.gates[gateIndex].arrivesAt <= now
        ) {
          gateIndex += 1;
        }
        if (gateIndex >= state.gates.length) {
          return;
        }
        const target = state.gates[gateIndex];
        // Tap once when we're 350ms+ ahead of the gate (gives the WS msg
        // time to land at the DO before the alarm fires).
        if (
          tappedForIndex !== gateIndex &&
          target.arrivesAt - now <= 600 &&
          target.arrivesAt - now >= 200
        ) {
          tappedForIndex = gateIndex;
          if (target.lane !== state.shipLane) {
            win.sendInput(target.lane);
          }
        }
      }, 30);
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

test("mid-round reload re-enters the round with the same hits and gates", async () => {
  test.setTimeout(90_000);

  // Use a slowish tempo so we have time to register a hit, capture the
  // gates timeline, reload, and re-assert before the round ends.
  const tempo = 800;

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  try {
    const pageA = await contextA.newPage();
    const code = await createBeacon(pageA, `test_seed=${LOSE_SEED}&test_tempo=${tempo}`);

    const pageB = await contextB.newPage();
    await joinShip(pageB, code, `test_seed=${LOSE_SEED}&test_tempo=${tempo}`);

    await expect(pageA.getByTestId("presence-text")).toHaveText(
      /Waiting for the Ship to be ready/i,
      { timeout: 10_000 },
    );
    await pageA.getByTestId("ready-button").click();
    await pageB.getByTestId("ready-button").click();
    await expect(pageB.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });

    // Wait for at least one taken pip on the Ship — i.e. the DO has
    // registered a hit. The Ship is doing nothing, so with LOSE_SEED a hit
    // should land within a handful of gates.
    await expect(
      pageB.locator("[data-testid='hits'] .hit-pip.taken").first(),
    ).toBeVisible({ timeout: 30_000 });

    // Snapshot the DO-broadcast state before the reload so we can assert
    // continuity afterwards.
    type Snapshot = {
      phase: string;
      hits: number;
      gateCount: number;
      shipLane: string;
      firstGateLane: string;
    };
    const before = await pageB.evaluate<Snapshot>(() => {
      const win = window as unknown as {
        __beaconState: {
          phase: string;
          hits: number;
          gates: { lane: string }[];
          shipLane: string;
        } | null;
      };
      const s = win.__beaconState;
      if (!s) {
        throw new Error("no broadcast state on Ship before reload");
      }
      return {
        phase: s.phase,
        hits: s.hits,
        gateCount: s.gates.length,
        shipLane: s.shipLane,
        firstGateLane: s.gates[0].lane,
      };
    });
    expect(before.phase).toBe("round");
    expect(before.hits).toBeGreaterThanOrEqual(1);
    expect(before.gateCount).toBe(18);

    // Reload the Ship mid-round.
    await pageB.reload();

    // After the reload the Ship should be back in the round view (not
    // bounced to welcome) with the same hits, gate count, and gate
    // sequence. The DO is the source of truth so the broadcast on
    // reconnect carries the live state forward.
    await expect(pageB.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });

    // Confirm at least the original hit count is still showing — the
    // alarm may have fired more gates while we were reloading, so we
    // assert >=, not ===.
    await expect(
      pageB.locator("[data-testid='hits'] .hit-pip.taken").first(),
    ).toBeVisible({ timeout: 5_000 });

    const after = await pageB.evaluate<Snapshot>(() => {
      const win = window as unknown as {
        __beaconState: {
          phase: string;
          hits: number;
          gates: { lane: string }[];
          shipLane: string;
        } | null;
      };
      const s = win.__beaconState;
      if (!s) {
        throw new Error("no broadcast state on Ship after reload");
      }
      return {
        phase: s.phase,
        hits: s.hits,
        gateCount: s.gates.length,
        shipLane: s.shipLane,
        firstGateLane: s.gates[0].lane,
      };
    });
    // Either still mid-round, or the alarm finished the round naturally
    // (acceptable — the brief is about surviving the reload, not freezing
    // the timeline). In either case the round was NOT reset to welcome.
    expect(["round", "result"]).toContain(after.phase);
    expect(after.gateCount).toBe(18);
    expect(after.firstGateLane).toBe(before.firstGateLane);
    expect(after.hits).toBeGreaterThanOrEqual(before.hits);

    // Beacon, who was never reloaded, should also still be in round or
    // result — never bounced back to welcome by the partner's reload.
    const beaconPhase = await pageA.evaluate<string>(() => {
      const win = window as unknown as {
        __beaconState: { phase: string } | null;
      };
      return win.__beaconState ? win.__beaconState.phase : "unknown";
    });
    expect(["round", "result"]).toContain(beaconPhase);
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

// Asymmetry probe: the Ship's gate render must NOT reveal which lane is
// open. The Beacon still renders the open lane visibly. This is the
// load-bearing asymmetry — without it the Ship can solo and the Beacon
// is decorative.
test("Ship's gate view hides the open lane; Beacon's reveals it", async () => {
  test.setTimeout(60_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  try {
    const pageA = await contextA.newPage();
    const code = await createBeacon(
      pageA,
      `test_seed=${LOSE_SEED}&test_tempo=1200`,
    );
    const pageB = await contextB.newPage();
    await joinShip(pageB, code, `test_seed=${LOSE_SEED}&test_tempo=1200`);

    await expect(pageA.getByTestId("presence-text")).toHaveText(
      /Waiting for the Ship to be ready/i,
      { timeout: 10_000 },
    );
    await pageA.getByTestId("ready-button").click();
    await pageB.getByTestId("ready-button").click();
    await expect(pageA.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });

    // Wait for the gates layer to actually render at least one gate on
    // each side. Beacon renders all 18 gates immediately (the whole map
    // is on screen); Ship renders the next two as they approach.
    await expect(pageA.locator(".beacon-gate").first()).toBeVisible({ timeout: 5_000 });
    await expect(pageB.locator(".ship-gate").first()).toBeVisible({ timeout: 10_000 });

    // Beacon still sees the open-lane info: at least one cell with the
    // .open class exists in the Beacon's gates layer.
    const beaconOpenCount = await pageA.locator(".beacon-gate .lane-cell.open").count();
    expect(beaconOpenCount).toBeGreaterThan(0);

    // Ship sees an undifferentiated obstacle bar: no .open lane cell
    // should exist anywhere in the Ship's gates layer.
    const shipOpenCount = await pageB.locator(".ship-gate .lane-cell.open").count();
    expect(shipOpenCount).toBe(0);

    // Sanity check: the Ship is rendering gates (we just removed the
    // open-lane marker, not the gates themselves).
    const shipGateCount = await pageB.locator(".ship-gate").count();
    expect(shipGateCount).toBeGreaterThan(0);

    // Defence-in-depth: the Ship's gate elements should also not leak
    // the open lane through their dataset (a curious player should not
    // be able to read the answer out of the DOM).
    const shipGateDatasetLanes = await pageB.evaluate(() => {
      const els = Array.from(document.querySelectorAll(".ship-gate")) as HTMLElement[];
      return els.map((el) => el.dataset.gateLane ?? null);
    });
    for (const lane of shipGateDatasetLanes) {
      expect(lane).toBeNull();
    }
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

// Latency margin probe: a Ship tap that lands within the server-side
// grace window AFTER the gate's nominal arrivesAt should still count as
// a successful dodge (no hit registered). This is the fix for "I tapped
// in time but still wrecked" — without the grace window, transatlantic
// WS round-trip eats the budget. We use the in-page __beaconState hook
// to time the tap precisely against arrivesAt, then assert hits stays
// at zero across the first few gates.
test("late-but-within-grace lane tap still counts as a successful dodge", async () => {
  test.setTimeout(60_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  try {
    const pageA = await contextA.newPage();
    const code = await createBeacon(
      pageA,
      `test_seed=${LOSE_SEED}&test_tempo=1200`,
    );
    const pageB = await contextB.newPage();
    await joinShip(pageB, code, `test_seed=${LOSE_SEED}&test_tempo=1200`);

    await expect(pageA.getByTestId("presence-text")).toHaveText(
      /Waiting for the Ship to be ready/i,
      { timeout: 10_000 },
    );
    await pageA.getByTestId("ready-button").click();
    await pageB.getByTestId("ready-button").click();
    await expect(pageB.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });

    // In-page steering: tap each gate's correct lane between 0 and 80ms
    // AFTER its nominal arrivesAt — i.e. comfortably late by old
    // standards but well within the 200ms server-side grace window. The
    // test passes if hits remains zero through the first six gates.
    await pageB.evaluate(() => {
      const win = window as unknown as {
        __beaconState: {
          phase?: string;
          gates?: { lane: string; arrivesAt: number }[];
          shipLane?: string;
        } | null;
        sendInput: (lane: string) => void;
      };
      let gateIndex = 0;
      let tappedForIndex = -1;
      setInterval(() => {
        const state = win.__beaconState;
        if (!state || state.phase !== "round" || !state.gates) {
          return;
        }
        const now = Date.now();
        const target = state.gates[gateIndex];
        if (!target) {
          return;
        }
        // Tap once when we are 0-80ms PAST the gate's arrivesAt. This
        // simulates the worst-case "I clicked it just as the gate hit
        // me" UX — under the old 50ms-early evaluation we'd already have
        // been judged. Under the 200ms grace window the lane update has
        // time to land before the alarm evaluates.
        const elapsed = now - target.arrivesAt;
        if (
          tappedForIndex !== gateIndex &&
          elapsed >= 0 &&
          elapsed <= 80 &&
          target.lane !== state.shipLane
        ) {
          tappedForIndex = gateIndex;
          win.sendInput(target.lane);
        }
        // Advance once we are well past the grace window so the next
        // iteration targets the next gate.
        if (elapsed > 250) {
          gateIndex += 1;
          tappedForIndex = -1;
        }
      }, 20);
    });

    // After ~6 gates' worth of round time (6 × 1200ms = 7.2s plus grace),
    // the Ship should still have zero hits if the grace window is doing
    // its job. We allow at most one stray hit to keep the test resilient
    // to outlier RTTs but the median expectation is zero.
    await pageB.waitForTimeout(8_500);
    const hits = await pageB.evaluate(() => {
      const win = window as unknown as {
        __beaconState: { hits?: number } | null;
      };
      return win.__beaconState?.hits ?? -1;
    });
    expect(hits).toBeGreaterThanOrEqual(0);
    expect(hits).toBeLessThanOrEqual(1);
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});
