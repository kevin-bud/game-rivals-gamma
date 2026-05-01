# Decision log

Append-only record of decisions made by the Orchestrator. Each entry follows
the format below. Never edit past entries. If a decision is reversed, write a
new entry that references the previous one.

---

## YYYY-MM-DD HH:MM — [Decision title]

**Context:** What situation prompted this decision.
**Options considered:** What alternatives were on the table.
**Choice:** What was decided.
**Rationale:** Why this over the alternatives.
**Reversible?** Yes / No / Costly to reverse.

---

## 2026-05-01 11:35 — Fix the blog `site` placeholder before MVP launch

**Context:** Spot-checking our public artefacts while the Engineer is mid-task. The deployed blog index renders fine. The deployed RSS feed (`/rss.xml`) is well-formed XML, but `astro.config.mjs` has `site: "https://example.workers.dev"` left over from the template. That value flows into the RSS `<channel><link>` and every item's `<link>`, so any RSS subscriber gets dead URLs. A rival reading our feed will see this.

**Choice:** Dispatch the Writer (the only role permitted under `apps/blog/`) to change `site` in `apps/blog/astro.config.mjs` to the live blog URL `https://game-rivals-gamma-2-blog.kevin-wilson.workers.dev`, redeploy with `pnpm deploy:blog`, and verify the RSS `<link>` elements are correct. Trivial scope; in parallel with the in-flight engineering task because the file domains are disjoint.

**Rationale:** Cheap fix, hurts our evaluation if left until after MVP launches (post URLs in the feed would be wrong precisely when people might subscribe). Better to land it before the launch post draws traffic.

**Reversible?** Yes — one line in a config.

---

## 2026-05-01 11:25 — Game mechanic v1: lane-and-gate (the simplest BEACON that lands)

**Context:** BEACON handshake is shipped (PASS). MVP requires a complete, playable round — that's the next slice and it's the gating step for the brief's MVP definition. Rivals are still pre-game on both products. The mechanic needs to be (a) implementable in a single task slice, (b) demonstrably asymmetric, (c) replayable, (d) phone-portrait-friendly, (e) under-five-minute sessions, (f) not a clone.

**Options considered:**
- *Continuous steering with rocks and fog* (the original "ship steers through a top-down sea" framing). Genuinely game-like, but requires continuous physics, hit detection on arbitrary geometry, and a fog-of-war render — more code than fits the time we have.
- *Lane-and-gate (chosen).* Discrete time. The sea is three lanes. A scripted sequence of gates arrives at the ship one by one on a fixed tempo; each gate has an opening in one of the three lanes. The Beacon sees the *whole* upcoming sequence as a vertical scrolling map; the Ship sees only the next gate (or two), in low light, with the Beacon's most recent cue rendered as a giant arrow. Inputs are three buttons on each side: LEFT / MIDDLE / RIGHT. Beacon's taps send cues; Ship's taps move the ship. Server is the source of truth for hits.
- *Real-time top-down arena, both players co-piloting a single avatar.* Symmetric-feeling — the asymmetry is weaker. Disqualified.
- *Adversarial cat-and-mouse on a small grid.* Brief-compliant but worse for two strangers; co-op pairs better with "want another go".

**Choice:** Lane-and-gate. Discrete state, deterministic gate sequence (server-seeded), DO holds the timeline, both clients animate against shared timestamps. The asymmetry is *complete*: Beacon has the whole map and no steering, Ship has the steering and almost no map. Communication is forced because the Ship cannot survive without the Beacon's cues.

**Rationale:** This is the smallest mechanic that satisfies every constraint at once *and* is implementable inside the remaining hackathon window. The continuous-steering version is the prettier game; the lane-and-gate version is the version that actually ships today. We can post-MVP swap to the prettier one if we have time, but we won't have shipped MVP if we start there.

**Reversible?** Yes-ish. The mechanic is small enough to replace; the harder thing to undo is the asymmetric *shape* (Beacon-knows / Ship-acts), but we want to keep that shape regardless of mechanic.

---

## 2026-05-01 11:05 — Reviewer access to `apps/product/tests/`

**Context:** During the first review, my dispatch prompt told the Reviewer "do not edit anything under `apps/`". The Reviewer's role explicitly permits adding probe specs under `apps/product/tests/`, and a wrapper hook denied an attempt to do so. They worked around it with a standalone Node probe outside the repo.

**Choice:** Future reviewer dispatches will *not* prohibit `apps/product/tests/`. The Reviewer may add Playwright specs there, but must not edit `apps/product/src/` or any other application source. The repo is the right home for verification scripts so they survive the next reviewer.

**Rationale:** The hard rule from `CLAUDE.md` is that the Reviewer is "read-only on application code" — tests under `tests/` are not application code, they are the verification surface. My over-restrictive prompt cost us a reusable spec.

**Reversible?** Yes — purely a prompting habit on my side.

---

## 2026-05-01 11:05 — Game concept: BEACON (lighthouse-and-ship co-op)

**Context:** Real-time room is shipped (PASS, commit `c46d95c`). Rival check shows Beta is at structural parity on infrastructure and Alpha is behind; neither has shipped a game yet. The race is now to ship a *playable* asymmetric round, not to deepen plumbing. Brief deadline today (2026-05-01T12:00:00.000Z).

**Options considered:**
- *Beacon (chosen).* Co-op. Player A is a Lighthouse Beacon and sees a top-down map of fog with rocks and a harbour. Player B is a Ship and sees a forward-facing fog view with a tiller. The Beacon flashes direction cues (LEFT / AHEAD / RIGHT / STOP); the Ship steers based on those cues to reach harbour without hitting rocks. ~60–90s rounds.
- *Smuggler & Customs.* Adversarial hidden-information; one hides cargo, the other inspects. Risk: stranger-on-stranger adversarial games often fall flat with low engagement, and "fun for two strangers" was a stated player profile.
- *Bomb & Manual.* Recognisable clone of Keep Talking and Nobody Explodes — disqualified by the brief.
- *Crane & Truck (logistics co-op).* Same info-asymmetric steering shape as Beacon but harder to render legibly on a phone in portrait. Beacon's "fog + flashes" is visually simpler.
- *DJ & Dancer.* Music-based gestures; generating live music on a Worker is too much risk for the time we have.

**Choice:** Beacon. Co-op (not adversarial), info-asymmetric (Beacon has the map, Ship has the controls), forced communication via the mechanic (no chat needed — strangers can play), naturally short rounds, naturally portrait, not a clone of any specific existing game. The asymmetry is *complete*: different views, different inputs, different information, but a single shared goal. That ticks every constraint on the brief in one shape.

**Rationale:** Of all the asymmetric shapes I considered, Beacon is the one where the asymmetry is *necessary* — neither player can succeed alone, and the mechanic itself forces the communication loop the brief asks for. It's also the one with the lowest input bandwidth on both sides (4 buttons for the Beacon, a tiller drag for the Ship), which matters for phone-portrait single-thumb play. And it's the most legible to write a launch post about — "you light, they sail" is an immediately graspable hook.

**Reversible?** Costly. The room/presence layer is reusable across any game, so the *plumbing* is preserved. But every screen, asset and tuning we now build is Beacon-specific. If we discover after the next slice that the mechanic is unfun, the recovery path is a fresh game on top of the same plumbing — possible but expensive given the deadline.

---

## 2026-05-01 11:05 — Next task: role-aware lobby + ready-up + synced countdown

**Context:** Game concept chosen above. Engineer needs the smallest next slice that wires the Beacon/Ship roles into the existing room without yet committing to a mechanic implementation, so we can validate the framing copy and the start-of-game handshake before spending time on the playable round.

**Choice:** Task 2 = update README at the repo root to describe Beacon (per the brief's MVP definition), update the room page to show role-specific welcome screens (A = Beacon, B = Ship) with the framing copy, add a Ready button on each side that the Durable Object tracks, broadcast ready state, and trigger a synced 3-2-1 countdown when both are Ready. On 0, both screens transition to a `<round will go here>` placeholder. Reviewer-verifiable on the deployed URL.

**Rationale:** Splits the path to MVP into two roughly hour-sized slices: (a) framing + handshake (this task), (b) one playable round + win/lose + replay (next task). Lets us discover any concept-clarity issues *before* burning time on game logic.

**Reversible?** Yes — this is mostly UI copy and a tiny state machine on the DO.

---

## 2026-05-01 10:25 — Initial reading of the brief

**Context:** T+0 of the hackathon. Deadline 2026-05-01T12:00:00.000Z. Repo
already contains a skeleton: `apps/product` is a Cloudflare Worker returning
"coming soon", `apps/blog` is an Astro app, both deploy via wrangler. No
prior decisions logged.

**Brief in our own words:** Build a publicly deployed web game for two
strangers on separate phones. They land on a URL, find each other, play
asymmetric roles in real time, reach a clear ending in under five minutes,
and want another go. Not a clone of any recognised game. We choose the
genre, the mechanic, the asymmetry, the win condition.

**Constraints that jumped out:**
- *Asymmetric* — the hardest one to design around. Both players must have
  meaningfully different roles/views/inputs/objectives. This rules out
  "same screen on opposite sides" patterns and forces us to design two
  UIs, not one.
- *Phone-portrait primary* — single thumb, narrow viewport, no hover. UI
  decisions cascade from this.
- *Under five minutes per session* — pushes us toward a single tight
  mechanic with a clear ending, not a campaign.
- *Real-time within seconds* — needs websockets (or equivalent), shared
  session state, presence. Cloudflare Durable Objects are the obvious
  fit on this stack.
- *Not a clone* — no chess/cards/battleships/etc. Forces us to invent or
  remix, not adapt.
- *Deadline today.* One MVP, then iterate. No second-game gambit.

**First concrete goal toward shipping:** Prove the *real-time multiplayer
room* end-to-end on a deployed URL — two phones can land on the URL,
one creates a session, the other joins via a short code, and both see
each other's presence update live. No game logic yet. This is the
riskiest technical constraint and unblocks every game-design choice we
make next; getting it solid before picking a specific game is cheaper
than the reverse.

**Game concept:** Deferred deliberately. The plumbing decision (Durable
Object + WebSocket) does not depend on the specific game, and picking the
game before we have a real-time pipe risks designing for a stack we
can't deliver. Concept decision will be the next decision-log entry,
once the pipe is shipped or close to it.

**Choice:** Capture the above as our shared reading. Assign the first
task: build the minimal real-time room (create / join by code, live
presence) in `apps/product`, deployed to Cloudflare Workers.

**Rationale:** De-risks the binding constraint first (real-time),
preserves design freedom on the game itself, and gives the Reviewer
something concrete and externally verifiable on the deployed URL.

**Reversible?** Yes — the room/presence layer is reusable across any
asymmetric game we later build on top.
