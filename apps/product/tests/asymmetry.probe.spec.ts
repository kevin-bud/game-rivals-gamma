import { test, expect, chromium, type Page } from "@playwright/test";

// Independent Reviewer probes for the asymmetry repair (commit bb790bd0).
// These intentionally do NOT share testIDs or selectors with the Engineer's
// asymmetry spec in round.spec.ts. They walk the rendered DOM the way a
// curious player would and assert the visual asymmetry holds — open lane is
// invisible to the Ship, the Beacon's UI looks like a different game, and
// the in-round role banner actually shows then hides.

const baseURL =
  process.env.PRODUCT_URL ??
  "https://game-rivals-gamma-product.kevin-wilson.workers.dev";

const LOSE_SEED = 1;
const SLOW_TEMPO_MS = 1200;

const createBeacon = async (page: Page, extraQuery: string): Promise<string> => {
  await page.goto(`${baseURL}/`);
  await page.getByTestId("create-button").click();
  await page.waitForURL(/\/r\/[A-Z0-9]{4,6}/);
  const code = (await page.getByTestId("room-code").innerText()).trim();
  await page.goto(`${baseURL}/r/${code}?role=A&${extraQuery}`);
  return code;
};

const joinShip = async (page: Page, code: string, extraQuery: string): Promise<void> => {
  await page.goto(`${baseURL}/r/${code}?role=B&${extraQuery}`);
};

const readyAndStart = async (pageA: Page, pageB: Page): Promise<void> => {
  await expect(pageA.getByTestId("presence-text")).toHaveText(
    /Waiting for the Ship to be ready/i,
    { timeout: 10_000 },
  );
  await pageA.getByTestId("ready-button").click();
  await pageB.getByTestId("ready-button").click();
  await expect(pageA.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });
  await expect(pageB.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });
};

// Independent probe: walk the Ship's gates-layer with no testIDs, no shared
// CSS class assumptions, and assert that EVERY rendered lane cell has an
// identical computed background colour. If any cell renders with a
// different background, the open lane is leaking visually to the Ship.
test("independent: Ship's gate cells all share identical computed background", async () => {
  test.setTimeout(60_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  try {
    const pageA = await contextA.newPage();
    const code = await createBeacon(
      pageA,
      `test_seed=${LOSE_SEED}&test_tempo=${SLOW_TEMPO_MS}`,
    );
    const pageB = await contextB.newPage();
    await joinShip(pageB, code, `test_seed=${LOSE_SEED}&test_tempo=${SLOW_TEMPO_MS}`);

    await readyAndStart(pageA, pageB);

    // Wait until the Ship has at least one gate on screen.
    await pageB.waitForFunction(
      () => document.querySelectorAll("#gates-layer > *").length > 0,
      null,
      { timeout: 10_000 },
    );

    // Walk the Ship's gates-layer DOM independently — no class assumptions.
    // For every gate child element, check (a) no descendant has a non-null
    // data-gate-lane attribute, (b) every direct cell-like child shares the
    // same computed backgroundColor and the same computed borderTopColor.
    const result = await pageB.evaluate(() => {
      const layer = document.getElementById("gates-layer");
      if (!layer) {
        return { ok: false, reason: "no gates-layer" };
      }
      const gates = Array.from(layer.children) as HTMLElement[];
      if (gates.length === 0) {
        return { ok: false, reason: "no gates rendered" };
      }
      const allBackgrounds = new Set<string>();
      const allBorderTops = new Set<string>();
      const leakedLanes: string[] = [];
      const cellCount: number[] = [];
      for (const gate of gates) {
        // Defence-in-depth: no element below this gate should expose the
        // open-lane through any data-* attribute.
        const dataLane = gate.getAttribute("data-gate-lane");
        if (dataLane !== null) {
          leakedLanes.push(`gate@${gate.className}=${dataLane}`);
        }
        const innerLeak = gate.querySelector("[data-gate-lane]");
        if (innerLeak) {
          leakedLanes.push(`inner=${innerLeak.getAttribute("data-gate-lane")}`);
        }
        const cells = Array.from(gate.children) as HTMLElement[];
        cellCount.push(cells.length);
        for (const cell of cells) {
          const computed = window.getComputedStyle(cell);
          allBackgrounds.add(computed.backgroundColor);
          allBorderTops.add(computed.borderTopColor);
        }
      }
      return {
        ok: true,
        gates: gates.length,
        cellCount,
        backgrounds: Array.from(allBackgrounds),
        borderTops: Array.from(allBorderTops),
        leakedLanes,
      };
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.gates).toBeGreaterThan(0);
    // Each Ship gate should render exactly three lane cells.
    for (const count of result.cellCount) {
      expect(count).toBe(3);
    }
    // Critical asymmetry: across ALL Ship gate cells, only one background
    // colour and one border-top colour are observed. Multiple values would
    // mean the open lane is rendered differently from the walls — i.e. the
    // Ship can read the answer.
    expect(result.backgrounds.length).toBe(1);
    expect(result.borderTops.length).toBe(1);
    // No data-gate-lane attribute leaks the answer through the DOM.
    expect(result.leakedLanes).toEqual([]);

    // Sanity: the Beacon's view DOES still expose the open lane visually.
    // Beacon should produce at least two distinct background colours across
    // its rendered cells (open vs walls).
    const beaconBackgrounds = await pageA.evaluate(() => {
      const layer = document.getElementById("gates-layer");
      if (!layer) {
        return [] as string[];
      }
      const cells = Array.from(layer.querySelectorAll("div > div")) as HTMLElement[];
      const set = new Set<string>();
      for (const cell of cells) {
        set.add(window.getComputedStyle(cell).backgroundColor);
      }
      return Array.from(set);
    });
    expect(beaconBackgrounds.length).toBeGreaterThanOrEqual(2);
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

// Probe the role banner: it should appear when the round starts and
// disappear within ~5s. The Engineer flagged this as not directly tested.
test("in-round role banner appears at round start, then hides", async () => {
  test.setTimeout(60_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  try {
    const pageA = await contextA.newPage();
    const code = await createBeacon(
      pageA,
      `test_seed=${LOSE_SEED}&test_tempo=${SLOW_TEMPO_MS}`,
    );
    const pageB = await contextB.newPage();
    await joinShip(pageB, code, `test_seed=${LOSE_SEED}&test_tempo=${SLOW_TEMPO_MS}`);

    await readyAndStart(pageA, pageB);

    // Both banners should be visible (opacity 1) right after the round
    // begins, and should carry their role-specific copy.
    const beaconBanner = pageA.getByTestId("role-banner");
    const shipBanner = pageB.getByTestId("role-banner");

    await expect(beaconBanner).toContainText(/Beacon — guide the ship/i);
    await expect(shipBanner).toContainText(/Ship — follow the beacon/i);

    // Confirm visible (opacity > 0.5) shortly after the round starts.
    await expect
      .poll(
        async () =>
          await pageA.evaluate(() => {
            const el = document.getElementById("role-banner");
            if (!el) {
              return 0;
            }
            return parseFloat(window.getComputedStyle(el).opacity);
          }),
        { timeout: 4_000 },
      )
      .toBeGreaterThan(0.5);

    // Confirm hidden (opacity < 0.1) within the banner's 3.5s + transition.
    await expect
      .poll(
        async () =>
          await pageA.evaluate(() => {
            const el = document.getElementById("role-banner");
            if (!el) {
              return 1;
            }
            return parseFloat(window.getComputedStyle(el).opacity);
          }),
        { timeout: 8_000 },
      )
      .toBeLessThan(0.1);
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

// Probe the Beacon-side "ship is here" tag: it should follow the Ship's
// lane changes. Engineer flagged this code path as not directly asserted.
test("Beacon's 'ship is here' tag follows the Ship's lane changes", async () => {
  test.setTimeout(60_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  try {
    const pageA = await contextA.newPage();
    const code = await createBeacon(
      pageA,
      `test_seed=${LOSE_SEED}&test_tempo=${SLOW_TEMPO_MS}`,
    );
    const pageB = await contextB.newPage();
    await joinShip(pageB, code, `test_seed=${LOSE_SEED}&test_tempo=${SLOW_TEMPO_MS}`);

    await readyAndStart(pageA, pageB);

    // Read which ship-here slot is visible on the Beacon side.
    const visibleHereLane = async (): Promise<string | null> =>
      await pageA.evaluate(() => {
        for (const lane of ["L", "M", "R"]) {
          const el = document.getElementById(`here-${lane}`);
          if (el && window.getComputedStyle(el).display !== "none") {
            return lane;
          }
        }
        return null;
      });

    // Ship taps L. Beacon's L slot should be the visible one.
    await pageB.getByTestId("lane-L").click();
    await expect.poll(visibleHereLane, { timeout: 5_000 }).toBe("L");

    // Ship taps R. Beacon's tag should follow.
    await pageB.getByTestId("lane-R").click();
    await expect.poll(visibleHereLane, { timeout: 5_000 }).toBe("R");

    // Ship taps M. Beacon's tag should follow.
    await pageB.getByTestId("lane-M").click();
    await expect.poll(visibleHereLane, { timeout: 5_000 }).toBe("M");
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

// 375px portrait check for BOTH Beacon and Ship round views — no
// horizontal overflow regression on the differentiated UIs.
test("Beacon and Ship round views fit a 375px portrait viewport", async () => {
  test.setTimeout(60_000);

  const browser = await chromium.launch();
  const contextA = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const contextB = await browser.newContext({ viewport: { width: 375, height: 667 } });

  try {
    const pageA = await contextA.newPage();
    const code = await createBeacon(
      pageA,
      `test_seed=${LOSE_SEED}&test_tempo=${SLOW_TEMPO_MS}`,
    );
    const pageB = await contextB.newPage();
    await joinShip(pageB, code, `test_seed=${LOSE_SEED}&test_tempo=${SLOW_TEMPO_MS}`);

    await readyAndStart(pageA, pageB);

    for (const page of [pageA, pageB]) {
      const dims = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(dims.scrollWidth).toBeLessThanOrEqual(dims.clientWidth);
    }

    // Lane buttons reachable and ≥40px tall on both sides — even with the
    // Beacon's longer "↑ Ahead" label the buttons must not collapse.
    for (const page of [pageA, pageB]) {
      for (const lane of ["L", "M", "R"]) {
        const btn = page.getByTestId(`lane-${lane}`);
        await expect(btn).toBeVisible();
        const box = await btn.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    }
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});
