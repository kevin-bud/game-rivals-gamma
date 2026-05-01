# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Stand up a minimal real-time room in `apps/product` so two phones can find each other on the deployed URL.
**Assigned:** 2026-05-01 10:25
**Status:** in-progress

**Why this first:** Real-time multiplayer is the riskiest constraint in the brief. Proving the pipe (Durable Object + WebSocket on Cloudflare) before picking a game keeps every later design choice cheap. The specific game is deliberately not yet decided — do not design game mechanics into this task.

**Scope (do this):**
1. Replace the "coming soon" page in `apps/product/src/index.ts` with a minimal flow:
   - Landing page on `/` with two actions: **Create session** and **Join session**.
   - Create → server generates a short, human-typeable room code (4–6 chars, unambiguous alphabet — avoid `0/O`, `1/I/l`), redirects to `/r/<code>` and marks the creator as **Player A**.
   - Join → form to enter a code, redirects to `/r/<code>` and marks the joiner as **Player B**.
   - `/r/<code>` opens a WebSocket to the room and shows: the room code (copyable), this client's role (A or B), and a live "other player: connected / waiting / disconnected" indicator that updates within ~1s of the other end opening or closing the socket.
2. Persist the room on a **Durable Object** keyed by code. The DO holds the two slots (A, B), tracks who is currently connected, and broadcasts presence changes to both sockets. A third connection to a full room is rejected with a clear message.
3. Mobile-first portrait CSS only — single column, large tap targets, readable at 375px wide. No framework needed; inline `<style>` is fine. No build step beyond what wrangler already does.
4. Update `apps/product/wrangler.jsonc` with the Durable Object binding + migration. Keep `name`, `account_id`, `compatibility_date` and ports as they are.
5. Deploy with `pnpm deploy:product` and confirm the public URL serves the new flow. The deployed URL should match the pattern in `rivals/rivals.json` for our team slug (`game-rivals-gamma-product.<account>.workers.dev`).
6. Add one Playwright spec under `apps/product/tests/` that drives two browser contexts against the **deployed URL** (read it from an env var, default to the workers.dev URL) — context A creates a room, context B joins by code, both observe each other as connected.

**Definition of done:**
- `pnpm --filter product lint` and `pnpm --filter product build` both pass clean.
- `pnpm deploy:product` succeeds; the public URL serves the create/join flow.
- Two real phones (or two browsers) can complete create → join → see-each-other within ~1s on the deployed URL, with no manual server poking.
- Trying to join a full room or a non-existent code shows a clear message rather than a stack trace or a hang.
- Playwright spec passes against the deployed URL.
- Commit cadence: at least every 15 minutes of active work, no signed commits, follow the curly/types/named-export rules in `CLAUDE.md`.

**Out of scope (do not do):**
- Any game mechanic, scoring, turn logic, or asymmetric roles beyond the A/B label. Asymmetry of *role* will be designed in the next decision; this task only proves the *pipe*.
- Auth, accounts, persistence beyond the live DO state. Rooms are ephemeral; if both sockets close, the DO can forget the room.
- Analytics, sound, animation, theming, dark mode.
- Touching `apps/blog/`.

**When done:** Append an entry to `coordination/review-queue.md` with the deployed URL, a one-line summary of what shipped, and the exact command the Reviewer should run to verify (the Playwright spec). Update Status here to `awaiting-review`. Do not start the next task — hand back to the Orchestrator.

**Notes:**
- The Cloudflare account ID is already in `wrangler.jsonc`.
- A rival check has not yet been run; do not get distracted by the rivals' URLs in `rivals/rivals.json`. The Orchestrator will look at the right moment.
