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
