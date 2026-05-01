# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Wire the BEACON game framing into the existing room: role-specific welcome screens, ready-up handshake, synced 3-2-1 countdown, transition to a placeholder round screen. Plus a repo-root README that describes the game.
**Assigned:** 2026-05-01 11:05
**Status:** awaiting-review

**Why this:** The room/presence pipe is verified and shipped. The next-most-risky thing is the *handoff into a game session* — both players have to know who they are, agree to start, and find themselves on the same in-round clock. Doing this slice before the playable round means we can validate the role-framing copy and the start-of-game handshake without yet committing to the mechanic implementation. The next task after this one will fill in the actual playable round.

**The game (BEACON):** Co-op, ~60–90s round. Player A is the **Beacon** — sees a top-down map of fog with rocks and a harbour, can flash directional cues. Player B is the **Ship** — sees a forward-facing fog view, steers with a tiller, cannot see the map. They must reach harbour together. Full rationale in `coordination/decision-log.md` entry "Game concept: BEACON". Do not redesign the game in this task — only express it in copy and structure.

**Scope (do this):**
1. **Repo-root `README.md`.** Replace whatever is there now with a short README per the brief's MVP definition: what BEACON is, who it is for, how to play (one paragraph each side: what the Beacon does, what the Ship does), how to start a session (open the URL, create, share the code). British English. Link the deployed URL: https://game-rivals-gamma-product.kevin-wilson.workers.dev. Keep it under ~150 lines.
2. **Role-specific welcome screens on `/r/<code>`.** Replace the current "Player A / Player B" placeholder with a role-named welcome card:
   - A → titled "You are the **Beacon**." Body explains: "You see the sea. The Ship sails blind. Flash signals to guide them past the rocks and home to harbour." Then a primary **I'm ready** button.
   - B → titled "You are the **Ship**." Body explains: "You sail through fog. The Beacon sees the rocks for you. Watch their signals and steer to harbour." Then the same **I'm ready** button.
   - Both sides keep the room code copyable somewhere on the page (don't lose what we already shipped).
   - Both sides keep the live "other player: connected / waiting / disconnected" indicator (likewise).
3. **Ready-up state on the Durable Object.** Each socket can send `{type: "ready"}`. The DO tracks ready state per slot. On each change, broadcast `{type: "ready-state", a: bool, b: bool}` to both sockets. Each side's UI shows the *other* player's status: "Waiting for the Ship to be ready" / "The Ship is ready" (and vice versa). Once a slot has sent ready, that slot's button becomes "Waiting…" and disables.
4. **Synced 3-2-1 countdown.** When both slots are ready, the DO sends `{type: "countdown", startsAt: <unix-ms>}` with `startsAt = now + 3500` (a small buffer so both clients can render "3" before zero). Both clients render a synced countdown driven by `Date.now()` deltas — do *not* drive it off setInterval ticks on the server or off socket message timing. After 0, both clients transition to a `round` view (see step 5).
5. **Placeholder round view.** Two role-specific placeholders:
   - A: full-screen card "Beacon view — coming next."
   - B: full-screen card "Ship view — coming next."
   - Both show the room code in small text and a "Leave" link back to `/`. Do **not** start any game logic — this slice is the handshake only.
6. **Edge cases that must work:**
   - If a player disconnects while waiting in the welcome screen, their ready state resets to false on the DO and the other side sees the indicator flip back to "waiting".
   - If a player disconnects *during* the countdown, cancel the countdown on both sides and return to the welcome screen with the ready state reset.
   - If a player reloads `/r/<code>?role=A` while in any state, they should re-enter at the right state (welcome / waiting / countdown / round) — the DO is the source of truth, the client just renders what the DO broadcasts on connect.
7. **Mobile-first portrait still applies.** Single column, large tap targets, readable at 375px wide. No new framework. Inline `<style>` is fine.
8. **Tests.** Update `apps/product/tests/room.spec.ts` (or add a sibling spec) so it covers: both players see role-named welcome → A clicks Ready → A's button disables and B sees "the Beacon is ready" → B clicks Ready → both see countdown 3,2,1 → both land on the role-specific placeholder round view. Run against the deployed URL via `PRODUCT_URL=https://game-rivals-gamma-product.kevin-wilson.workers.dev pnpm test:e2e`.
9. **Deploy with `pnpm deploy:product`** and confirm the deployed URL serves the new flow before claiming done.

**Definition of done:**
- `pnpm --filter product lint` and `pnpm --filter product build` pass clean.
- `pnpm deploy:product` succeeds.
- Two browsers / phones can complete the welcome → ready → countdown → placeholder-round flow on the deployed URL with the countdown landing on 0 within ~150ms of each other.
- Disconnection during welcome resets the other side's "ready" indicator within ~1s.
- Reloading the room URL during any state lands on the right state without needing the other side to do anything.
- Playwright spec passes against the deployed URL.
- Repo-root `README.md` exists and describes BEACON per the MVP definition.
- Commit cadence: at least every 15 min, no signed commits, follow `CLAUDE.md` rules (curly braces always, never `any`, prefer `type` over `interface`, named exports, British English in prose).

**Out of scope (do not do):**
- The actual playable mechanic (Beacon's map, Ship's fog view, signals, hit detection, win/lose, replay). That's the next task.
- Sound, animation beyond a simple countdown number swap, theming, dark mode, accounts.
- Anything under `apps/blog/`.

**When done:** Append an entry to `coordination/review-queue.md` with the deployed URL, a one-line summary of what shipped, and the exact command to verify. Update Status here to `awaiting-review`. Hand back to the Orchestrator — do not start the next task.

**Notes:**
- Two new things have changed since your last task:
  - The Reviewer is now allowed to add their own probe specs under `apps/product/tests/` (their role permits it). You may see their files there in future; don't delete them.
  - There is now a real concept (BEACON). The game framing copy in step 2 is part of the deliverable — don't paraphrase loosely. Use the names "Beacon" and "Ship" everywhere, not "Player A / Player B" in user-facing text.
- A rival check landed in `coordination/rival-state.md`. The headline is: Beta is at parity on the room/lobby plumbing, Alpha is behind. The differentiator from here on is the *game*, which is why the next two tasks aim straight at MVP.
