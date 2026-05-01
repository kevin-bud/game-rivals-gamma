# Review queue

The Engineer adds entries here when claiming work is shipped. The Reviewer
processes entries top-down, runs the relevant Playwright tests against the
deployed URL, and writes a verdict.

A claim is not "shipped" until the Reviewer verifies it.

---

## Template

**Commit:** [sha]
**Claim:** What the Engineer says is now working.
**Reviewer verdict:** PASS / FAIL — [reasoning, evidence]

---

## 2026-05-01 — BEACON playable round v1 (lane-and-gate, end screen, rematch) — closes the MVP slice

**Commit:** 8b9423e017c68ce5ca180c4d73641f4347a17480
**Deployed URL:** https://game-rivals-gamma-product.kevin-wilson.workers.dev
**Claim:** The BEACON room now plays a full round end-to-end and supports an in-room rematch. This closes the brief's MVP definition: open the URL on a phone, get into a session with a second player, play to a clear ending, optionally play again, all without manual intervention.

What changed:
- The `Room` Durable Object owns a full round timeline. On `phase: "round"` it generates 18 gates (one per ~1.7s) using a 6-line xorshift32 PRNG seeded from `Date.now() ^ hash(roomId)`, biased so two consecutive gates rarely share an opening. The DO schedules one alarm per next-gate `arrivesAt`. On each alarm it evaluates every gate that has arrived, comparing against the live `shipLane`. A miss increments `hits`; `hits >= 3` ends the round as `lost`. Surviving all 18 gates ends it as `won`.
- Client → DO messages: `{type:"lane",lane}` (Ship only — moves the ship); `{type:"cue",direction}` (Beacon only — broadcasts a directional cue to the Ship); `{type:"play-again"}` (either side — when both flagged, the room regenerates gates, resets state, and re-runs the existing 3-2-1 countdown into a fresh round).
- DO → both clients: extended the existing `state` message with `gates`, `gateInterval`, `shipLane`, `hits`, `latestCue`, `result`, `roundStartedAt`. Sent on every state change. Clients animate locally between broadcasts using `Date.now()` against `gate.arrivesAt`, exactly like the countdown.
- Beacon view (slot A): vertical scrolling map of the entire 18-gate sequence, top → bottom, ship marker at the bottom in its current lane. Three lane buttons send cues. Sees hit counter and ship flash on hit.
- Ship view (slot B): narrow 3-lane strip showing the next two gates approaching. Big arrow at the top of the screen is the Beacon's most recent cue (auto-hides after 1.5s). Three lane buttons move the ship. Hit counter, screen flashes red on a hit.
- End-of-round screen (both sides): "Saved." (green) on win or "Wrecked." (red) on lose. Role-specific subtitle — Beacon: "You guided them home." / "They went down on your watch." — Ship: "You made it." / "You hit one rock too many." Primary "Another go" button (becomes "Waiting…" once tapped); the other side sees "The Ship/Beacon wants another go." Secondary "Leave" link to `/`.
- Reload-into-correct-state still applies. The DO is still the source of truth and broadcasts the full state on connect, so a mid-round reload re-renders at the right point with the right hits/lane/cue/gates timeline.
- Disconnect mid-countdown or mid-round resets the room to welcome (existing behaviour preserved). Disconnect during the result screen leaves the survivor on their verdict.
- Test hooks (documented inline in `src/index.ts`): the WS endpoint accepts `?test_seed=<n>` and `?test_tempo=<ms>` (clamped to ≥200ms) so the e2e spec can pin a reproducible round and accelerate tempo. The page forwards the same query params to the WS. The page also exposes the latest broadcast state on `window.__beaconState` so the spec can steer the Ship deterministically. Real clients never set or read these.
- All user-facing prose in British English ("Saved." / "Wrecked." / "Another go" / "guided them home").
- Mobile portrait at 375px works on every screen including in-round views (lane buttons reach 50px+ tall, no horizontal overflow on welcome / countdown / round / result).
- Lint clean (`pnpm --filter product lint`), build clean (`pnpm --filter product build`), deployed (`pnpm deploy:product`).

**Verify:**
```
PRODUCT_URL=https://game-rivals-gamma-product.kevin-wilson.workers.dev pnpm --filter product test:e2e
```
All 14 specs pass against the deployed URL (29.1s locally on this machine). The new specs in `apps/product/tests/round.spec.ts`:
- `two clients play through to a Wrecked. ending and can rematch` (drives the full create → join → ready → countdown → round → end → rematch → second round → end loop with `?test_seed=1&test_tempo=250`).
- `Ship can chase the open lanes to a Saved. ending` (uses the `__beaconState` test hook to steer correctly and reach a `Saved.` verdict).
- `hits indicator updates on both sides during a round` (asserts at least one taken hit pip on both sides).
- `welcome → countdown → round all fit a 375px portrait viewport` (375×667 viewport, asserts zero horizontal overflow on round + result, 40px+ lane button height).
The existing `room.spec.ts` and `handshake.probe.spec.ts` were updated to match the new round shape (the placeholder titles `Beacon view — coming next.` / `Ship view — coming next.` are gone; in their place the round HUD shows `Beacon · room ABCDE` / `Ship · room ABCDE` and the lane buttons L/M/R).

For a manual two-phone smoke: open two phones, create on one, join on the other, both press Ready, ride out a real ~30s round, see Saved. or Wrecked., tap "Another go" on both, ride out a second round.

**Reviewer verdict:** _pending_

---

## 2026-05-01 — BEACON role-aware lobby + ready handshake + synced countdown

**Commit:** fcd3719de39358f88cfdbcea4549f10f3854994e
**Deployed URL:** https://game-rivals-gamma-product.kevin-wilson.workers.dev
**Claim:** The room page now expresses the BEACON game framing end-to-end up to (but not including) the playable round. Slot A is shown as "You are the Beacon." with the brief-specified body copy; slot B is shown as "You are the Ship." with its body copy. Each side has an "I'm ready" button that posts `{type:"ready"}` over the existing WebSocket. The Durable Object tracks ready state per slot, broadcasts `{type:"state", phase, a:{connected,ready}, b:{connected,ready}, countdownStartsAt?}` to both sockets on every change, and on `both ready` transitions to `phase: "countdown"` with `countdownStartsAt = now + 3500ms`. Both clients render a synced 3 → 2 → 1 countdown driven by `Date.now()` deltas (no setInterval timing). At t=0 the DO promotes to `phase: "round"` (via a DO alarm scheduled at `countdownStartsAt`) and broadcasts; both clients render their role-specific placeholder ("Beacon view — coming next." / "Ship view — coming next.") with the room code and a Leave link. Disconnect on welcome resets that slot's ready flag. Disconnect during countdown cancels the countdown, resets both ready flags, and returns both sides to the welcome screen. Reload at any time re-enters the correct phase because the DO is the source of truth and broadcasts state on connect. The room code stays visible and copyable on the welcome card. Cross-presence text now reads "Waiting for the Ship to join…" / "Waiting for the Beacon to be ready." / "The Ship is ready." etc. instead of the old "connecting / waiting / connected". Repo-root `README.md` rewritten to describe BEACON for human readers per the brief's MVP definition. Mobile-first portrait at 375px, no new framework, inline `<style>`. Lint and build pass. Deployed.

**Verify:**
```
PRODUCT_URL=https://game-rivals-gamma-product.kevin-wilson.workers.dev pnpm --filter product test:e2e
```

All five specs in `apps/product/tests/room.spec.ts` should pass:
- `two contexts land on role-named welcome screens`
- `ready handshake leads through countdown to role-specific round view`
- `disconnect on welcome flips the other side's ready indicator back to waiting`
- `joining a non-existent room shows a clear message`
- `joining a full room shows a clear message`

For a manual two-phone smoke (the deeper acceptance criteria — countdown sync within ~150ms, disconnect-flip within ~1s, reload-into-correct-state — are easiest to feel by eye): open two phones, create on one, join on the other, both press Ready, watch both screens hit "0" together, then reload either phone mid-countdown to verify it re-enters the correct phase from the DO state.

**Reviewer verdict:** PASS — All 5 specs in `apps/product/tests/room.spec.ts` pass against the deployed URL (5/5 in 6.7s). Added `apps/product/tests/handshake.probe.spec.ts` with 5 independent probes — copy never uses "Player A/B" anywhere on landing or welcome cards, both clients land on the round view within <1s of each other (skew measured per-test), disconnect during countdown returns the survivor to the welcome screen with the ready button re-enabled, reload of the Ship's page re-enters the same role in the same room from DO state, and welcome + round views have zero horizontal overflow at 375px with a 40px+ tap target on the Ready button. Full suite: 10/10 passing in 8.6s. README at the repo root reads cleanly to a non-coder — explains the game in one sentence, describes both roles in plain language, and gives a numbered "open URL → create → share code → join → ready" walkthrough.

---

## 2026-05-01 — Real-time room (create / join / presence)

**Commit:** c46d95cfdcec6231e6bda9e2fecaaabf5da13382
**Deployed URL:** https://game-rivals-gamma-product.kevin-wilson.workers.dev
**Claim:** Landing page offers "Create session" and "Join session". Create generates a 5-char code from an unambiguous alphabet, redirects to `/r/<code>?role=A`. Join validates the code via the Durable Object and redirects to `/r/<code>?role=B`. The room page opens a WebSocket to `/r/<code>/ws?role=…` against a `Room` Durable Object that holds the two slots and broadcasts presence on connect/disconnect. A third connection to a full room is rejected with a clear page; an unknown code shows a clear "doesn't exist" page. Mobile-first portrait layout, no framework, inline styles. Build and lint clean. Deployed.

**Verify:**
```
cd apps/product
PRODUCT_URL=https://game-rivals-gamma-product.kevin-wilson.workers.dev pnpm test:e2e
```
All three specs in `apps/product/tests/room.spec.ts` should pass:
- `two contexts can find each other in a room`
- `joining a non-existent room shows a clear message`
- `joining a full room shows a clear message`

**Reviewer verdict:** PASS — All three specs in `apps/product/tests/room.spec.ts` pass against the deployed URL (3/3 in 3.0s). Independent probe at iPhone SE 375×667 confirms portrait viability (no horizontal overflow on landing or room, 53px tap targets), unambiguous code alphabet (sample `M5MNH`, no 0/O/1/I/L), presence flips both ways within ~2.5s on a fresh create→join, and clear error copy on both paths: unknown code shows "That room code doesn't exist. Ask Player A to share their code again." and a third joiner gets "Room is full — only two players per room." (17/17 reviewer checks passed).
