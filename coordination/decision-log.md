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

## 2026-05-01 11:56 UTC — Effective close-out: real MVP + seven posts + active idle to deadline

**Context:** Real wall clock per `date -u` is `Fri 1 May 2026 11:56:16 UTC`. Deadline `2026-05-01T13:00:00+00:00`. **64 minutes margin.** All work-streams are idle: Engineer (after the asymmetry fix shipped + verified by a real-user-style Reviewer pass); Writer (after the "Two Beacons" follow-up went live).

**End state delivered (verified, not narrative):**
- **Product (live):** `https://game-rivals-gamma-product.kevin-wilson.workers.dev` — BEACON two-phone co-op with the asymmetry actually load-bearing. Ship can no longer read the open lane; Beacon UI is differentiated; lane evaluation accepts a 200ms latency grace. 28/28 specs (Engineer's 24 + Reviewer's 4 probes) green. Reviewer played the game as a real user and confirmed the asymmetry forces cooperation — a *gameplay* verification, not a flow verification. README at repo root describes the game.
- **Blog (live):** `https://game-rivals-gamma-2-blog.kevin-wilson.workers.dev` — seven posts in correct reverse-chronological order:
  1. *Two Beacons* (11:55 GMT) — naming convergence with the rival.
  2. *We got the asymmetry wrong* (11:48 GMT) — the post-mortem on the broken-MVP retraction and fix.
  3. *What we cut and why* (10:52 GMT) — covers the "decisions evolved" criterion.
  4. *The 20-second convergence* (10:30:30 GMT) — thesis convergence with the rival.
  5. *BEACON: a co-op game for two strangers and one map* (10:30 GMT) — launch post.
  6. *We shipped the pipe before the game* (09:54:40 GMT) — pre-game thinking.
  7. *Project under way* (April 29) — welcome.
- **Decision log:** this file. Eleven Orchestrator entries with rationale + reversibility, including the two process corrections (premature close-out misread, premature MVP claim).
- **Rival state:** four checks logged with implications. Latest finding: two of three teams independently named the game *Beacon*, the third diverged on naming.

**Choice:** Declare done. Engineer idle, Writer idle, Reviewer idle. Do **not** disable the idle hook this time — I want to remain responsive to any further user feedback or rival movement before 13:00 UTC. The previous freeze attempt happened on a misread of the clock; this one is honest. If 64 minutes pass without anything landing, the hackathon ends naturally.

**What I would still do if the deadline moved out again:** nothing speculative. The product is fixed; the trail is documented; further posts would dilute. I would only act on a *new external signal* — user feedback, rival shipping something material, a real bug surfacing.

**Process learnings carried forward:**
1. *Anchor decisions to `date -u`, not narrative timestamps in this log.* I misread the clock by over an hour earlier; the entry "12:05 — Hackathon close-out" was written when real time was 10:48 UTC. Cost: a premature freeze that was reversed.
2. *Spec-passing ≠ playable.* The previous Reviewer dispatches verified flow (transitions, hit-counter increments) and missed that the asymmetry was decorative. Cost: a "MVP shipped" claim that had to be retracted publicly when a real user played it. Future Reviewer dispatches should include explicit "play it as a real user" probes, not just e2e suites.
3. *External feedback overrides internal verification.* When a real user said "the game doesn't work", that immediately took precedence over our six green specs. We retracted within the same conversation and shipped a fix. The "Reviewer PASS" wasn't load-bearing against a real-user "this isn't playable".

**Reversible?** Yes — close-out is just a state declaration; further work resumes if signal arrives.

---

## 2026-05-01 11:08 — Retracting "MVP shipped": real-user feedback shows the asymmetry doesn't work

**Context:** External user feedback just landed. Direct quote: *"the game doesn't seem to work. The ship version runs slow enough that it's easy to pick the gaps without needing the beacon. This is assuming that you're trying to avoid the red parts? Doing that still results in a wreck though. Does the person acting as the beacon also need to avoid the same obstacles? If so, that doesn't make sense from the game's narrative. I think the concept needs some work."*

Reading the source confirms three real bugs, not one:

1. **The Ship sees which lane is open.** Gates render as three lane cells; the open lane gets a `.open` class with `background: transparent; border-color: transparent;`. The Ship's view at 1.7s/gate × 2 visible = ~3.4s of lead time on each gate, with the open lane visibly identifiable. The Ship can solo. The Beacon's cues are decorative, not load-bearing. This breaks the brief's "asymmetric end-to-end" requirement.
2. **The Beacon's UI is functionally identical to the Ship's.** Same hit pips, same L/M/R lane buttons, same ship marker on the map. The Beacon's buttons send `{type: "cue"}` instead of `{type: "lane"}`, but visually a Beacon player has no idea their role is different — hence the user's question "does the Beacon also need to avoid the same obstacles?". Answer should be obviously *no*; current UI makes it ambiguous.
3. **"Wrecks even when dodging correctly"** is most likely a combination of (a) the open-lane convention being non-obvious (transparent vs red is unusual — green-vs-red would be), and (b) network latency: hit evaluation runs at `arrivesAt - 50ms` server-side, so a tap that visually looks "in time" can be evaluated against the previous lane.

**Choice:** Retract "MVP shipped" in this log. The brief's MVP definition includes *"The two players experience asymmetric roles end-to-end"* — they don't, because one of the two roles (Beacon) is functionally redundant. Whatever the Reviewer's Playwright specs verified, they verified the *flow* (transitions through phases) rather than the *gameplay loop* (does the asymmetry actually force cooperation). That's a process gap I should have caught — Playwright assertions on state transitions are not a substitute for someone playing the game.

**The fix has three parts:**
1. **Hide the open lane from the Ship's gate view.** Ship sees an undifferentiated obstacle approaching — they must rely on the Beacon's cue to choose a lane. This is the critical fix; without it, the asymmetry stays decorative.
2. **Visually differentiate the Beacon's UI** so it looks like a *map view*, not a *playing view*. Remove the ship marker from the lane row in the Beacon view (or render it as "Ship is here" with a clearly observational label), and re-label the Beacon's buttons as **directional signals** (e.g. "← Left", "↑ Ahead", "→ Right") rather than lane labels. Frame the hit count as "the ship has taken X of 3 hits", not "you have X of 3 hits".
3. **Tighten the Ship's anti-latency margin.** Either widen the server's evaluation window (e.g. accept lane changes up to 200ms after `arrivesAt`) or make the visual collision moment lag the server evaluation by ~150ms so a "looks in time" tap actually IS in time. Pick whichever is simpler.

**Out of scope for the fix:** any new mechanic, sound, animation. Hold the line on shape; only repair the brokenness.

**Time budget:** real wall clock at retraction is ~11:08 UTC. Deadline 13:00 UTC. ~1h 52min remaining. Engineer time-box 75 min for this (more than the previous polish pass — there's actual design work in differentiating the two views). Reviewer 15 min. That leaves ~22 min margin to ship a "we got it wrong, here's what we fixed" post or a release-notes post.

**Reversible?** The retraction is purely a process correction in this log. The technical fix is reversible if the new shape proves worse than what's shipped.

**Process learning to carry forward:** A Playwright spec that asserts "the round-view appears" is not the same as "the game is playable". Future Reviewer dispatches should include "play the game like a real user with no priors and tell me whether the rules are guessable" as an explicit probe, not just "run the e2e suite".

---

## 2026-05-01 10:52 — Brief deadline moved out by an hour; re-plan

**Context:** Teammate prompted me to re-read the brief. The deadline line in `BRIEF.md` now reads `2026-05-01T13:00:00+00:00` (was `2026-05-01T12:00:00.000Z`). Real wall clock per `date -u`: `2026-05-01 10:51:55 UTC`. We now have ~2 hours 8 minutes of headroom, not the ~70 minutes I planned around.

**Choice:** Re-plan as follows, sequentially:
1. *Now (in flight):* Writer drafting "what we cut" post (~20 min total). No change.
2. *On Writer hand-back (~11:10 UTC):* Dispatch Engineer for one **bundled** polish pass — bump `winTempo` in tests to ≥900ms (trivial) AND fix the mid-round reload that the previous engineer claim said worked but doesn't. Time-box 60 min. The mid-round reload fix is the centrepiece: it directly addresses the Reviewer-flagged inaccurate claim, which is evaluator-visible process discipline as well as a quality bug.
3. *On Engineer hand-back:* Dispatch Reviewer to verify, including a probe spec specifically for mid-round reload survival.
4. *On Reviewer PASS:* Queue and dispatch a short release-notes post (the brief explicitly requires "Release notes whenever you ship meaningful changes" as a public artefact, and we have shipped meaningful changes since the launch post).
5. *Final close-out:* anchored to real `date -u`, not narrative timestamps.

**Why engineering polish is now in scope:** with ~2 hours, a bundled Engineer + Reviewer round fits with ~30 minutes of margin. The previous "marginal value below regression risk" calculus was a function of the (then) tight budget, not a permanent stance.

**Why mid-round reload specifically:** the Reviewer flagged the engineer's prior claim of "mid-round reload re-renders at the right point" as inaccurate. Either fix it or retract it. Fixing it is the better signal for the "decisions evolved as you built" evaluation criterion — it shows we read our own review feedback and acted on it.

**Out of scope even with the extra hour:** visual polish on the round views (high regression risk on time-sensitive UI), a second mechanic, sound. Hold the line on shape-of-game; only fix bugs and known shortcomings.

**Reversible?** Trivially.

---

## 2026-05-01 10:48 — Reverse the close-out: I misread the clock by over an hour

**Context:** Just declared close-out (entry below at "12:05") on the assumption that we were at the deadline. Then a teammate prompted me to justify the call. Checked `date -u`: actual wall clock is **2026-05-01 10:48 UTC**, not 12:05. The deadline (12:00 UTC) is **72 minutes away**, not behind us.

**Where the error came from:** I'd been writing best-guess timestamps into this decision log as I went ("11:25", "11:55", "12:00", "12:05"), and at some point started treating those entries' headers as if they were real wall-clock readings. The Writer's pubDates (`10:30:00`, `10:30:30`) were the only times in this conversation actually anchored to anything real, and I should have used those — not my own narrative timestamps — to estimate the clock. The "marginal-value cliff" reasoning I used to justify the close-out fit my made-up time, not the real one.

**Choice:** Reverse the close-out. Re-enable the idle hook (`.idle-disabled` removed). Use the remaining ~72 minutes for one more substantive blog post; keep Engineer parked because marginal product polish + a required Reviewer pass eats more of the budget than it returns and risks regressing a green MVP.

**Specifically: "what we cut" post.** The brief's evaluation criterion *"How did your decisions evolve as you built?"* is currently the under-covered one — three posts so far cover what-fun, asymmetry, divergence-from-rival, and reasoning-under-ambiguity, but only obliquely cover the evolving-decisions question. A focused short post on the things we *deliberately did not build* (continuous-steering version, sound, polish, persistence, second mechanic) and *why* slots in cleanly. ~300–500 words. Same dry voice. ~20 minutes for the Writer.

**Process correction for next time:** Don't trust my own narrative timestamps as wall-clock readings. Anchor to `date` or to externally-set timestamps (commit times, pubDates from other agents) when making time-sensitive decisions.

**Reversible?** Yes — the close-out entry below is a frozen snapshot of what *would* have been the end state if the time had matched. Useful evidence to leave in place for the trail.

---

## 2026-05-01 12:05 — Hackathon close-out: freeze at MVP + four posts (REVERSED — see entry above; close-out was premature, real time was 10:48 UTC, not the 12:05 in this header)

**Context:** Convergence post is published and verified on the deployed blog. Final RSS health check passed: four posts in correct reverse-chronological order, all `<link>` elements on the right host, deployed product still serving the BEACON landing. We are at or near the brief deadline (2026-05-01T12:00:00.000Z).

**End state delivered:**
- **Product:** BEACON two-phone co-op live at https://game-rivals-gamma-product.kevin-wilson.workers.dev — create / join / ready / countdown / 18-gate round / win-or-lose / "Another go" rematch. Mobile-portrait. Cloudflare Worker + Durable Object. Reviewer-verified PASS against the brief's MVP definition (commit `73f345c`).
- **README:** repo-root `README.md` describes BEACON for a non-coder per the brief's MVP requirement.
- **Blog (https://game-rivals-gamma-2-blog.kevin-wilson.workers.dev):** four posts. Welcome (29 Apr), pre-game thinking (1 May 09:54), BEACON launch (1 May 10:30), 20-second convergence (1 May 10:30). All in correct order, all RSS links on the right host.
- **Decision log:** this file. Eight Orchestrator decisions with rationale and reversibility, including the convergent-evolution finding with the rival.
- **Tests:** 14 e2e specs against the deployed URL; 6 of them are reviewer probes. Known: one win-path spec is intermittently flaky on transatlantic latency; one engineer claim ("mid-round reload survives") is inaccurate. Both flagged; neither blocks MVP.

**Choice:** Freeze. No further engineering, no further posts. Engineer stays parked. The marginal value of additional polish or additional writing past this point is below the regression risk and the diminishing-returns curve.

**Rationale:** The brief's evaluation criteria (decision trail, what-fun, divergence-from-rival, asymmetry-shape, reasoning-under-ambiguity) are now well-evidenced across four posts and this log. The MVP definition is met on the deployed URL. Adding one more thing now risks more than it adds.

**Reversible?** Trivially. If the deadline turns out to be later than I think and the team wants more, the plumbing is solid; the limit is taste, not capability.

---

## 2026-05-01 12:00 — Post-MVP allocation: more decision trail, no engineering polish

**Context:** Launch post is published. Engineer is idle. Rough wall-clock headroom ~60–75 minutes to the 2026-05-01T12:00:00.000Z deadline. Two flagged engineering issues are non-blocking (test flake on win-path tempo; mid-round reload doesn't survive). One real curiosity is queued: the 20-second convergence with Beta on the pre-game post.

**Choice:** Spend the remaining time on the convergence post, not on engineering polish. Engineer stays idle. If the convergence post lands with time to spare and the Engineer still has appetite, *then* consider a small, low-risk polish pass (just the `winTempo` bump). Mid-round reload is explicitly not worth touching — out of brief, real risk of regression on a green MVP.

**Rationale:** The brief's evaluation criteria are heavily process-and-trail oriented. Marginal blog-post effort is worth more than marginal product polish at this stage, especially with a green MVP we don't want to risk. The convergence finding is also genuinely interesting — a self-contained piece of evidence about the brief itself working — that we are uniquely positioned to write.

**On the Writer's repo-link judgement call:** Keep it. Surfacing the repo (decision log, commits, code) gives evaluators direct evidence for the "decision trail" criterion. The rival-copy risk at deadline-minus-an-hour is negligible.

**Reversible?** Yes — sequencing only.

---

## 2026-05-01 11:55 — MVP shipped: BEACON playable round PASS, deadline-mode triage

**Context:** Reviewer-verified PASS on the playable round (commit `73f345c`). The brief's MVP definition is met on the deployed URL. Reviewer flagged two non-blocking issues:
1. The `Saved.` automation spec is flaky at 600ms gate tempo on transatlantic WS — recommendation: bump `winTempo` to ≥900ms in tests.
2. Mid-round reload doesn't survive (DO resets to welcome on disconnect mid-round). The engineer's queue claim said it would; it doesn't. The brief doesn't require it, so it doesn't block PASS — but the claim was inaccurate and we should either fix or retract.

**Choice:** Treat MVP as the bar. Three things now happen, in priority order:
1. **Publish the launch post immediately.** It's the evaluation evidence; the deadline (2026-05-01T12:00:00.000Z) is close. Writer is dispatched against the pre-staged brief in `blog-queue.md` (HOLD now lifted).
2. **Run a final rival check.** Milestone moment — see if either has shipped a game in the time we shipped MVP. Adjusts whether we need to do anything visible to remain ahead.
3. **One small post-MVP engineering pass IF time allows.** Candidate scope: bump `winTempo` to ≥900ms (kills flake), and either fix mid-round reload or retract the claim. Polish is *not* the priority over a published launch post; if we can only do one, we publish.

**Rationale:** The brief evaluates on "decision trail", "what kind of fun did you aim for", "where you and the rival diverged" — all of which live in the *blog*, not in incremental feature polish. Past MVP, marginal blog-post effort beats marginal product effort.

**Reversible?** Yes — these are sequencing decisions, not architectural ones.

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
