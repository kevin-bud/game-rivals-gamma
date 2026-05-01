# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Fix the BEACON asymmetry. Real-user feedback shows the Ship can solo because they can see which lane is open, the Beacon's UI is functionally identical to the Ship's, and tapping correctly still wrecks. Make the Beacon's role load-bearing.
**Assigned:** 2026-05-01 11:08 UTC (real wall clock)
**Status:** SHIPPED + VERIFIED. Engineer commit `bb790bd` (with coordination follow-up `5fb8f7b`); Reviewer PASS commit `e938cda`. Reviewer played the game as a real user and confirmed all three bugs are fixed: Ship cannot read the open lane, Beacon UI is differentiated, lane-grace window absorbs latency. 28/28 specs (engineer's 24 + reviewer's 4 probes) pass against the deployed URL. Engineer remains idle through close-out — no further work planned.

**Why this — read carefully:** A real user just played the deployed game and reported back. Direct quote in the most recent decision-log entry ("Retracting 'MVP shipped': real-user feedback shows the asymmetry doesn't work"). Read that entry first; it has the diagnosis, the planned fix, and the time budget.

The previous Reviewer PASSes verified that the *flow* worked (transitions, hit-counter increments, end-screen appears). They did *not* verify the *game design* (does the asymmetry actually force the Ship to depend on the Beacon, are the rules legible without a tutorial, does a correct dodge actually pass). That's a process gap we'll patch later; for now, fix the game.

**Three concrete bugs to fix:**

### 1. Hide the open lane from the Ship's gate view (the critical fix)

Currently in `apps/product/src/index.ts` around the `buildGateEl` function (~line 789): both Beacon and Ship gates render with one cell marked `.open` (transparent) and the other two as red walls. **For the Ship's view only**, render gates as a single undifferentiated obstacle bar with no visible "open lane" — the Ship must trust the Beacon's cue to know which lane to be in.

Suggested CSS: the Ship's gate is just a solid red bar across all three lanes (or a hatched bar). The Beacon still sees the open lane visibly transparent — that's the Beacon's information advantage.

The Beacon's render is unchanged. The Ship's render is what loses the gap visibility.

After this change, the Ship cannot win without the Beacon. That is the asymmetry the brief asks for. Without this change, no other fix matters.

### 2. Differentiate the Beacon's UI

The Beacon should look like they're operating a console / map, not playing the same game. Specifically:

- **Remove the ship marker from the Beacon's view's `ship-row`.** The Beacon already sees the ship's lane from the rendered map (you can render a small "ship is here" indicator on the gate map at the appropriate lane). The lane-row at the bottom should not show a ship triangle for the Beacon.
- **Re-label the Beacon's three buttons.** They are signals, not steering. Text on the Beacon's buttons should be `← Left`, `↑ Ahead`, `→ Right` (or similar). The Ship's buttons remain `L` / `M` / `R` (or you can change those to `←` / `↑` / `→` too — either is fine, just make them visually distinct from each other).
- **Reframe the hit pips on the Beacon side.** "X of 3 hits" with the *ship* as the subject — e.g. small text under the pips that says "ship hit count" on the Beacon side. The pips themselves can stay; just make sure the Beacon doesn't read them as "I am taking damage".
- **Add a one-line role banner above the gate area** when the round starts: Beacon sees "You are the Beacon — guide the ship.", Ship sees "You are the Ship — follow the beacon's cues.". Disappears after a few seconds. This is the in-round version of the welcome copy.

### 3. Tighten the Ship's anti-latency margin

Currently `evaluateDueGates` evaluates a gate when `gates[i].arrivesAt <= now + 50` (server time, 50ms early). Combined with WS round-trip latency, a Ship player tapping right at visual gate-collision can be evaluated against their *previous* lane.

Pick one of:
- **Server-side grace.** Change the evaluation to `arrivesAt + 150` instead of `arrivesAt - 50` — accept lane updates that arrive within 150ms after the gate "should have" hit. The visual collision moment then matches or precedes the evaluation.
- **Client-side visual lag.** Render gates such that visual collision happens 150ms *after* `arrivesAt`. Less invasive but more confusing if not commented.

Server-side grace is cleaner; pick that unless you see a reason not to.

Document the choice with an inline comment explaining the latency reasoning.

**Out of scope (do not do):**
- New mechanics, sound, animation, theming, additional polish.
- Re-naming the game, restructuring the DO state shape, changing the gate count or interval.
- Anything under `apps/blog/`.
- Mid-round reload / `winTempo` — already shipped.

**Tests:**
- The existing 21-spec suite should continue to pass. The mid-round-reload spec, presence specs, countdown specs, end-of-round specs are all behaviour you must not regress.
- Add at least one new spec that proves the Ship's gate render no longer reveals the open lane. (You can assert that in the Ship's `gates-layer`, no `.lane-cell.open` element exists, OR that all rendered gate cells share the same colour. Use whatever assertion best matches your CSS choice.)
- Add at least one spec that exercises an "open-lane tap right at gate arrival" scenario and asserts no hit was registered (proves the latency margin is doing its job). Use the existing `?test_seed=&n>&test_tempo=&ms>` hooks for determinism.

**Verify and deploy:**
- `pnpm --filter product lint` and `pnpm --filter product build` pass clean.
- `pnpm deploy:product` succeeds.
- Full e2e suite passes against `https://game-rivals-gamma-product.kevin-wilson.workers.dev`.
- Manually exercise both roles in two browsers if you can — does the Ship now actually need the Beacon? If you can win the round as Ship without looking at the Beacon's cues, the fix isn't done. Be honest with yourself about this.

**Definition of done:**
- All of the above.
- Append an honest entry to `coordination/review-queue.md` with deployed URL, verify command, and a precise claim about each of the three bugs (what changed, what you tested, what you didn't test).
- Status here set to `awaiting-review`.

**Time-box: 75 minutes maximum.** If you're at 60 min and only the open-lane-hiding fix is done, ship that and flag the rest as deferred. The open-lane fix is the only one that's strictly necessary for the asymmetry to load — the others are amplifiers.

**Wall clock at assignment:** 11:08 UTC. Deadline 13:00 UTC. After your hand-back we still need a Reviewer pass and at least one short blog post acknowledging the retraction-and-fix. Stick to the time-box.
