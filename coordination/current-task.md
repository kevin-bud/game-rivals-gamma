# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Ship the BEACON playable round v1 — lane-and-gate mechanic. Both players play to a clear win/lose ending in a single round, with a "Another go" rematch in the same room.
**Assigned:** 2026-05-01 11:25
**Status:** awaiting-review

**Why this:** This is the slice that lands the brief's MVP definition. After this PASS, "open the URL on a phone, get into a session with a second player, play to completion, see a clear ending, all without manual intervention" is true. Both rivals are still pre-game. Speed matters more than polish — ship a complete, playable thing today.

**The mechanic (lane-and-gate):**
- The sea has three lanes: LEFT, MIDDLE, RIGHT. Portrait. Vertical.
- The round has a fixed sequence of **gates** generated server-side at round start. Each gate has one open lane and arrives at the ship at a specific timestamp.
- **Beacon (Player A)** sees the *whole* gate sequence as a vertical map scrolling from top to bottom. The ship's current lane is rendered at the bottom. Beacon has three buttons — LEFT / MIDDLE / RIGHT — that *send a cue* to the Ship. Cues do not move the ship; they only render on the Ship's screen.
- **Ship (Player B)** sees a narrow three-lane strip: the next gate or two, the ship at the bottom, and the Beacon's most recent cue rendered as a large arrow at the top of the screen (LEFT / UP / RIGHT). Ship has three buttons — LEFT / MIDDLE / RIGHT — that move the ship into that lane.
- When a gate reaches the ship's row, the server checks: ship lane in the open lane → pass. Else → hit. **Three hits = lose.** Survive all gates = win.
- Round length: **18 gates × ~1.7s = ~30s**. Tunable in code; pick numbers that feel right.

**Architecture (must follow):**
1. **Durable Object owns the round state.** On round start, the DO generates the gate sequence with a deterministic seed (so the same round can be re-broadcast on reload). Store `{ gates: [{lane: "L"|"M"|"R", arrivesAt: number}], shipLane: "L"|"M"|"R", hits: number, latestCue: {direction: "L"|"M"|"R", sentAt: number} | null, result: "playing"|"won"|"lost", roundStartedAt: number }`.
2. **Hit detection on the DO.** Use one DO `alarm` per gate (or schedule them sequentially) to evaluate at each gate's `arrivesAt`. Compare against the *current* `shipLane`. Update `hits`. If `hits >= 3`, set `result: "lost"` and stop scheduling further gates. After the last gate, if still playing, set `result: "won"`.
3. **Client messages:**
   - Ship → DO: `{type: "lane", lane: "L"|"M"|"R"}` — updates `shipLane`. Ignored if `result !== "playing"`.
   - Beacon → DO: `{type: "cue", direction: "L"|"M"|"R"}` — updates `latestCue` with `sentAt: Date.now()`.
   - Either → DO: `{type: "play-again"}` — flags that player as wanting another go. When *both* have flagged, regenerate gates, reset hits, fresh `roundStartedAt`, kick off the existing 3-2-1 countdown, then start a fresh round. Show "Waiting for the Ship/Beacon to want another go" while half-pressed.
4. **DO → both clients:** broadcast a single state shape that covers the whole round; extend the existing `state` message you already have, don't bolt on a parallel channel. Send on every state change. Clients animate locally between broadcasts using `Date.now()` against `roundStartedAt` and `gate.arrivesAt`, exactly like you did with the countdown.
5. **Reload-into-correct-state still applies.** Mid-round reload re-renders the round at the right point, with the right hits/lane/cue/gates timeline.
6. **Both roles see hits as they happen.** Beacon sees the ship flash red on hit; Ship sees the screen flash and the hit counter tick up.

**End-of-round screen (both sides):**
- Big result word: **"Saved."** (won) or **"Wrecked."** (lost). British English.
- One line of subtitle reflecting the role: Beacon's says "You guided them home." / "They went down on your watch." Ship's says "You made it." / "You hit one rock too many." Keep it short, in keeping with the dry tone.
- Primary button: **"Another go"** — sends `{type: "play-again"}`. Once tapped, the button becomes "Waiting…" and the other side sees a small line: "The Ship/Beacon wants another go."
- Secondary link: **"Leave"** back to `/`.

**Scope (do this):**
1. Extend the Room DO to hold the round state shape above. Generate the gate sequence with a small deterministic PRNG (don't pull in a dep; xorshift32 in 6 lines is fine) seeded from `Date.now() ^ <hash of room code>`. Bias the sequence so two consecutive gates rarely have the same opening (avoids trivial sequences).
2. Replace both placeholder round views in `/r/<code>` with the real Beacon and Ship views described above. Single inline `<style>`, no framework, no SVG library — plain DOM (or `<canvas>` if you genuinely prefer; both are fine).
3. Wire the client → server messages and the broadcast handling. Animate from broadcast state.
4. Implement the end-of-round screen and the "Another go" rematch. After both players agree, run the existing 3-2-1 countdown then start a fresh round.
5. Tests in `apps/product/tests/`:
   - Add a spec that drives both browsers through create → join → ready → countdown → round-played-to-end → end screen visible. To make this deterministic, the simplest approach is a small test hook (e.g. honour a `?test_seed=<n>` query on `/r/<code>/ws` to force the gate seed, and/or accelerate tempo when an env var like `BEACON_TEST_MODE=1` is set on the Worker). Document any hook inline so the next person doesn't lose their mind. If you'd rather skip the hook and just assert the end screen *eventually* shows one of the two outcomes within ~45s, that's also fine — slower but simpler.
   - Update `room.spec.ts` and the reviewer's `handshake.probe.spec.ts` so they remain passing on the new flow. Adapt; don't delete.
6. Deploy with `pnpm deploy:product`. Verify the deployed URL serves the full flow.

**Definition of done:**
- `pnpm --filter product lint` and `pnpm --filter product build` clean.
- `pnpm deploy:product` succeeds.
- Two browsers / phones can complete a full session on the deployed URL: create → join → ready → countdown → round → end screen → another go → second round end screen. No manual intervention. No stack traces.
- Both win and lose endings are reachable. Ending text matches role.
- Hit count visible to both sides during the round. Reload mid-round survives.
- Playwright spec passes against the deployed URL.
- Mobile portrait at 375px still works on every screen, including the in-round views.
- Commit cadence: at least every 15 min. No signed commits. CLAUDE.md rules (curly always, never `any`, type-not-interface, named exports, British English in any prose).

**Out of scope (do not do):**
- Sound, music, haptics.
- Animated assets, sprite art, gradients beyond what plain CSS gives. The visual bar is *legible*, not pretty. The launch post will say so.
- Difficulty levels, scoring beyond win/lose, leaderboards, stats.
- Public matchmaking. Sharing the room code via the existing copyable code stays the only matchmaking mechanism.
- Dark mode, accounts, anything under `apps/blog/`.

**When done:** Append an entry to `coordination/review-queue.md` with the deployed URL, the verify command, and a short summary noting that this slice closes the brief's MVP definition. Update Status here to `awaiting-review`. Hand back to the Orchestrator. Do not start the next task — the Orchestrator will queue the launch post once the Reviewer PASSes.

**Notes:**
- This is the biggest task so far. Estimate generously, commit often, and don't refactor existing handshake code unless the new shape genuinely needs it.
- The reviewer's `handshake.probe.spec.ts` lives at `apps/product/tests/handshake.probe.spec.ts` — adapt rather than delete.
- "Another go" is part of the brief's "want another go?" hook. It is a deliverable, not a stretch goal.
- Rivals are still pre-game on both products and silent on both blogs since 04-29. We are racing them on speed-to-MVP, not feature breadth. Resist any urge to add features beyond the scope above.
