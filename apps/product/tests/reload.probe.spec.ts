import { test, expect, chromium, type Page } from "@playwright/test";

// Reviewer probe: the engineer asserted Beacon-side reload survival "by
// construction" because handleSlotDisconnect doesn't branch on slot — same
// no-op for phase==="round" regardless of which side dropped. The Ship-side
// spec in round.spec.ts proves it for the Ship; this spec proves the same
// invariant for the Beacon, so the symmetry claim is observed end-to-end,
// not just inferred from reading source.

const baseURL =
  process.env.PRODUCT_URL ??
  "https://game-rivals-gamma-product.kevin-wilson.workers.dev";

const LOSE_SEED = 1;

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

test("mid-round Beacon reload re-enters the round; Ship is never bounced", async () => {
  test.setTimeout(90_000);

  // Slowish tempo: enough headroom to register a hit, snapshot state,
  // reload the Beacon, and re-snapshot before the round ends naturally.
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

    // Both sides reach the round.
    await expect(pageA.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });

    // Wait for at least one taken pip on the Beacon side — i.e. the DO has
    // registered a hit and pushed it to both clients.
    await expect(
      pageA.locator("[data-testid='hits'] .hit-pip.taken").first(),
    ).toBeVisible({ timeout: 30_000 });

    type Snapshot = {
      phase: string;
      hits: number;
      gateCount: number;
      firstGateLane: string;
    };

    const beforeBeacon = await pageA.evaluate<Snapshot>(() => {
      const win = window as unknown as {
        __beaconState: {
          phase: string;
          hits: number;
          gates: { lane: string }[];
        } | null;
      };
      const s = win.__beaconState;
      if (!s) {
        throw new Error("no broadcast state on Beacon before reload");
      }
      return {
        phase: s.phase,
        hits: s.hits,
        gateCount: s.gates.length,
        firstGateLane: s.gates[0].lane,
      };
    });
    expect(beforeBeacon.phase).toBe("round");
    expect(beforeBeacon.hits).toBeGreaterThanOrEqual(1);
    expect(beforeBeacon.gateCount).toBe(18);

    // Reload the Beacon mid-round. This is the symmetric case to the
    // Ship-side spec — same handleSlotDisconnect path, same broadcast on
    // reconnect.
    await pageA.reload();

    // The Beacon should land back in the round view (not bounced to
    // welcome) and the broadcast state should be intact.
    await expect(pageA.getByTestId("round-view")).toBeVisible({ timeout: 10_000 });
    await expect(
      pageA.locator("[data-testid='hits'] .hit-pip.taken").first(),
    ).toBeVisible({ timeout: 5_000 });

    const afterBeacon = await pageA.evaluate<Snapshot>(() => {
      const win = window as unknown as {
        __beaconState: {
          phase: string;
          hits: number;
          gates: { lane: string }[];
        } | null;
      };
      const s = win.__beaconState;
      if (!s) {
        throw new Error("no broadcast state on Beacon after reload");
      }
      return {
        phase: s.phase,
        hits: s.hits,
        gateCount: s.gates.length,
        firstGateLane: s.gates[0].lane,
      };
    });
    // Either still mid-round, or the alarm finished the round naturally
    // (acceptable — what matters is that the round was NOT reset to welcome).
    expect(["round", "result"]).toContain(afterBeacon.phase);
    expect(afterBeacon.gateCount).toBe(18);
    expect(afterBeacon.firstGateLane).toBe(beforeBeacon.firstGateLane);
    expect(afterBeacon.hits).toBeGreaterThanOrEqual(beforeBeacon.hits);

    // The Ship, who was never reloaded, must never have been bounced back
    // to welcome by the partner's reload. This is the load-bearing
    // symmetric assertion: the Ship-side spec asserts the same property
    // about the Beacon when the Ship reloads, so together they prove the
    // mechanism is symmetric in observed behaviour, not just by reading
    // source.
    const shipPhase = await pageB.evaluate<string>(() => {
      const win = window as unknown as {
        __beaconState: { phase: string } | null;
      };
      return win.__beaconState ? win.__beaconState.phase : "unknown";
    });
    expect(["round", "result"]).toContain(shipPhase);
  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});
