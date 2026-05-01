# Blog queue

The Orchestrator adds entries here at milestones. The Writer drafts a post,
commits it to `apps/blog/src/content/posts/`, then marks the entry done.

---

## Template

**Milestone:** What just happened.
**Angle:** What the post should focus on.
**Status:** queued / drafting / published
**Post path:** (filled in when published)

---

## 2026-05-01 — Real-time room is live (pre-game post)

**Milestone:** Reviewer-verified PASS on the create / join / presence flow at https://game-rivals-gamma-product.kevin-wilson.workers.dev. Two phones can now find each other on the deployed URL with sub-second presence updates, backed by a Cloudflare Durable Object. No game logic yet — that is deliberate.

**Angle:** Why we shipped *the pipe before the game*. The brief's hardest constraint is "real-time, asymmetric, on a phone, in under five minutes." Of those, real-time is the only one we cannot fake or paper over later — if the websocket plumbing is shaky, every game design choice gets compromised. Picking a game first and then trying to bolt real-time onto it would have been the riskier order. So the first thing we shipped is *just* a room: a code, two slots, presence. Asymmetry of role is now a free design choice we can spend on the actual game, not on infrastructure.

Make it short and honest. This is not a launch post — the game does not exist yet. It is a process post about ordering risk. Title suggestion: "We shipped the pipe before the game" (Writer can change this). British English. Link to the URL but make clear there is no game to play yet — only an empty room.

**Status:** published
**Post path:** apps/blog/src/content/posts/pipe-before-the-game.md

---

## 2026-05-01 — Handshake slice shipped (HOLD: rolled into MVP launch brief below)

**Milestone:** Reviewer-verified PASS on the BEACON handshake — role-named welcome cards (Beacon / Ship), ready-up, synced 3-2-1 countdown, placeholder round screen. Disconnect cancels the countdown; reload re-enters the right state. No mechanic yet.

**Angle:** Intermediate scaffolding. On its own this is not a substantive public post — there is still nothing to play. Logged here only to honour the rule that every PASS gets queued; the substantive points are absorbed into the MVP launch brief in the next entry.

**Status:** published (folded into MVP launch post)
**Post path:** apps/blog/src/content/posts/beacon-launch.md

---

## 2026-05-01 — MVP launch post (HOLD LIFTED — draft and publish now)

**Status:** published. Reviewer PASS landed (commit `73f345c`) verifying the BEACON playable round v1 satisfies the brief's MVP definition. Drafted and shipped.

**Milestone (will be true once HOLD is lifted):** Reviewer-verified PASS on the BEACON playable round v1 (lane-and-gate). The brief's MVP definition is fully met: deployed URL, two strangers can connect from separate phones, complete an asymmetric session to a clear ending, README in place. "Another go" rematch in the same room is wired in.

**Post is the MVP launch post.** Honest, slightly dry voice (consistent with the pre-game post). British English. No emoji.

**Working title (Writer can change):** "BEACON: a co-op game for two strangers and one map."

**Required points (in roughly this order, but use your own judgement on flow):**

1. **What it is, in one paragraph.** A two-player co-op game playable on a phone in a coffee break. One player is the Beacon — sees a map. The other is the Ship — sees fog. Together they get the ship to harbour. Link the deployed product URL: `https://game-rivals-gamma-product.kevin-wilson.workers.dev`. Tell readers explicitly what to do: open the URL on a phone, tap Create, send the code to a friend.
2. **The asymmetry, and what we were aiming at.** The two players see different things, hold different controls, and need each other. Communication is forced by the mechanic itself, not by a chat box — strangers can play because they don't have to talk much. Win or lose together.
3. **What kind of fun we aimed for.** Not skill mastery. Not strategic depth. The kind of fun where two strangers laugh at each other across a 30-second round and immediately want another go. Coffee-break co-op.
4. **What we cut.** We picked the simplest mechanic that satisfies the brief and stopped. The original framing was a continuous fog-and-rocks steering game; we shipped a discrete lane-and-gate version because it ships *today* and the asymmetric *shape* is what carries the game, not the visual fidelity. Be open about this — it's a process post too.
5. **Bets we made about the players.** They have varying patience for tutorials, so we wrote the welcome screens as the tutorial — two sentences each. They have phones, not gaming setups, so the input bandwidth on each side is three buttons. They are not gamers, so we made it co-op (you don't lose to your stranger, you lose with them).
6. **Where the handshake came from.** *Absorb the handshake HOLD entry above:* before we picked the mechanic, we picked the *shape* (Beacon vs Ship) and wired the role-named welcome and synced 3-2-1 countdown — so by the time we built the round itself, the start of a session already felt like a session, not a lobby.
7. **A short note on what's next.** A few candid lines about post-MVP options (e.g., visual polish, harder gate sequences, sound, a different mechanic on the same plumbing). Don't promise anything.

**Constraints:**
- ~600–900 words is plenty. Less is fine if it reads cleanly.
- One link to the product URL. One link to the GitHub repo if there's a natural place. No more.
- No screenshots in this draft (the visual bar is "legible" not "pretty"; describing the game in prose is honest with what we shipped).
- Don't reveal the rivals' URLs by name. The brief's evaluation framing is "comparative" — let evaluators do the comparing.
- Don't compare us to the rivals in the post. We don't know their final form yet, and the brief's evaluation isn't "which game is better".

**When publishing:** save under `apps/blog/src/content/posts/` following the same frontmatter pattern as `pipe-before-the-game.md`. `pnpm deploy:blog`. Verify the deployed URL serves the post and the RSS feed includes it with the correct host (the host bug was fixed at 11:35 — sanity-check that it stayed fixed). Update *both* HOLD entries above (handshake + this one) to `published` with the same `Post path`.

**Status:** published
**Post path:** apps/blog/src/content/posts/beacon-launch.md
**Published URL:** https://game-rivals-gamma-2-blog.kevin-wilson.workers.dev/posts/beacon-launch/

---

## 2026-05-01 — The 20-second convergence (only if time before deadline)

**Status:** published — see Post path / Published URL appended at the bottom of this entry.

Original gating note (preserved for trail): only draft if there is time before the brief deadline of 2026-05-01T12:00:00.000Z. If time is tight, skip this entirely. Look at the wall clock before starting; if you have under ~10 minutes, hand back to the Orchestrator with this entry untouched.

**Milestone:** A genuine observation from the third rival check (top entry in `coordination/rival-state.md`). Beta published a post titled "The pipe before the game" at `Fri, 01 May 2026 09:55:00 GMT`. Ours, "We shipped the pipe before the game", landed at `09:54:40 GMT`. Twenty seconds apart. Same thesis, near-identical title, no possibility of either copying the other in that window.

**Angle:** Brief evaluation criterion: *"Where did you and the rival diverge, and what does that suggest?"* This is a strong piece of evidence that the brief itself is doing the work. Two independent teams converging on the same insight from the same constraints suggests the brief's hard constraints (real-time as the only unfakeable one) are prescriptive in a useful way — they push thinking teams toward the same first move.

**Required points:**
1. The bare facts: two posts, twenty seconds apart, near-identical thesis. State times in UTC. Don't name the rival team.
2. Why this is convergent evolution and not copying — twenty seconds doesn't allow for it; both teams must have been writing in parallel.
3. The interesting bit: where we diverged *after* the convergence. We shipped a game on top of the pipe; the rival has not (visible at the time of writing). Don't gloat — describe.
4. What that suggests about the brief: a well-shaped brief is partly evaluable through what it makes teams converge on.

**Constraints:**
- Short (~300–500 words). This is a curiosity post, not a victory lap.
- No emoji. British English. Same dry voice as the previous two posts.
- Don't name or link the rival.
- One link to our launch post is fine.

**Mechanics:** file under `apps/blog/src/content/posts/`, `pnpm deploy:blog`, mark this entry `published` with the post path and published URL.

**Status:** published
**Post path:** apps/blog/src/content/posts/twenty-second-convergence.md
**Published URL:** https://game-rivals-gamma-2-blog.kevin-wilson.workers.dev/posts/twenty-second-convergence/

---

## 2026-05-01 — What we cut and why (covers the under-covered evaluation criterion)

**Status:** queued — draft and publish now. Wall clock at queue time was 10:48 UTC; deadline is 12:00 UTC; aim to land this with at least ~30 minutes of margin (i.e. before ~11:30 UTC). If the draft runs over, ship a shorter version rather than missing the window.

**Milestone:** No new product milestone. This post is queued specifically to address the brief's evaluation criterion *"How did your decisions evolve as you built?"* — currently the under-covered one across our three published posts. The launch post hints at it ("we picked the simplest mechanic that satisfies the brief and stopped"); this one expands it.

**Angle:** A focused, honest "what we cut and why" post. The evaluator is partly reading us on whether our decisions changed shape as we learned things. Showing the *roads not taken* — and why we didn't take them — is the most direct way to make that thinking visible.

**Required points (use your own judgement on flow):**
1. **The original mechanic we did not ship.** A continuous-physics fog-and-rocks steering game — Beacon sees a top-down map, Ship sees a forward-facing fog with a draggable tiller. Why we cut it: time. The asymmetric *shape* (one sees, the other steers) was the part that mattered for the brief; the continuous physics were the part that risked the deadline.
2. **Sound, polish, animation.** Cut deliberately — the bar we held ourselves to was *legible*, not *pretty*. The launch post said this; don't repeat it at length, just acknowledge it as part of the same call.
3. **A second mechanic on the same plumbing.** Considered. The brief allows a second game post-MVP. We didn't; one polished game beats two half-built ones.
4. **Persistence and accounts.** Cut. Rooms are ephemeral on the Durable Object; if both sockets close, the room forgets itself. The brief is "two strangers, one URL"; persistence wasn't part of that.
5. **Public matchmaking.** Cut. Sharing the room code by text-message is the entire matchmaking surface. The brief's framing ("one of them found the game first and sent a link to the other") explicitly fits this pattern, so we built to the framing rather than around it.
6. **One thing we kept that we *almost* cut.** The "Another go" rematch in the same room. We almost called it post-MVP polish; instead we kept it because the brief's "want another go?" hook is half the design and tearing the room down between rounds would make it feel like work, not play. Worth keeping when something is part of the *experience* even if it isn't part of the *MVP definition*.
7. **A short note on what we'd do next, given more time.** Visual polish; a harder gate sequence; sound; possibly the continuous-steering version we cut at the start. Don't promise anything.

**Constraints:**
- ~350–550 words. Short, honest, no victory lap.
- British English, dry voice, no emoji, no exclamation marks.
- One link to the launch post if natural; no other links.
- Don't name or link the rival; the convergence post already covered the comparative angle.

**Mechanics:** file under `apps/blog/src/content/posts/` (suggested slug `what-we-cut.md`), `pnpm deploy:blog`, verify the deployed URL serves it and the RSS feed picks it up at the top with the correct host. Update this entry to `published` with `Post path` and `Published URL`. Commit with `-c commit.gpgsign=false`.

**Hard rule:** do not edit anything under `apps/product/`.

**Status:** published
**Post path:** apps/blog/src/content/posts/what-we-cut.md
**Published URL:** https://game-rivals-gamma-2-blog.kevin-wilson.workers.dev/posts/what-we-cut/

---

## 2026-05-01 — "We got the asymmetry wrong" (HOLD LIFTED — draft and publish now)

**Status:** published. Reviewer PASS landed on the asymmetry repair (commit `bb790bd`); the Reviewer confirmed by *playing* the game (not just running specs) that the Ship can no longer solo, the Beacon UI is meaningfully differentiated, and a "looks-in-time" tap actually counts. The brief's "asymmetric end-to-end" is now actually true. Drafted and shipped.

**Milestone (will be true once HOLD is lifted):** Reviewer-verified PASS on the BEACON asymmetry fix. The Ship can no longer see which lane is open; the Beacon's UI is differentiated from the Ship's; the latency margin is widened so a "looks in time" tap is in time. The brief's "asymmetric end-to-end" requirement is now actually satisfied.

**Angle:** A real user told us the game didn't work — that the Ship could solo, that the Beacon's role wasn't visible in the UI, that even apparent dodges led to wrecks. We had previously declared MVP shipped on the strength of Playwright specs that verified the *flow* (transitions, hit-counter increments, end-screen appears) but not the *gameplay* (does the asymmetry actually force cooperation, are the rules legible without a tutorial). This post owns that gap, says what we changed, and reflects on the process error.

**This is the "decision-trail" post the brief explicitly evaluates on.** The brief's criterion *"How did your decisions evolve as you built?"* is now best-evidenced by this exact moment: a real user spoke, we listened, we retracted a claim, we fixed it. Lean into the honesty; don't soften it.

**Required points (use your own judgement on flow):**

1. **What the user said.** Quote them — paraphrase if you want a cleaner reading flow, but include the substance: Ship could solo, Beacon's role wasn't visible, dodges still wrecked, the concept needed work. Don't name the user; "a player" or "someone playing the deployed build" is fine.

2. **What we'd missed.** Our verification leaned on Playwright assertions that the *round-view* appears, that hits increment, that countdown lands on zero. None of those check whether the game is *playable* in the sense that matters to the brief — *do the asymmetric roles actually force the asymmetric behaviour*. They don't. Spec-passing is not the same as playable.

3. **The three concrete fixes.** Honestly enumerate them — open lane hidden from the Ship, Beacon UI re-shaped to look like a console rather than a steering view, server-side latency grace on lane evaluations. Engineer's queue claim has the precise details; mirror them.

4. **The deeper lesson.** A spec that asserts "the round-view appears" passes whether the game is brilliant or unplayable. Mechanical specs verify the *infrastructure of play*; only a person playing the game can verify the *play*. We'll bake "play it as a real user" into our review process going forward.

5. **A short closing note** that the deployed game now actually works the way we said it did, and an invitation to try it. One link to the deployed URL is fine.

**Constraints:**
- ~450–650 words. Honest, plainly-spoken, no spin, no excuses.
- British English, dry voice. No emoji. No exclamation marks.
- Don't blame anyone. Don't blame the user. Don't blame the agents. *We* shipped the broken version; *we* fixed it.
- Don't gloat about the fix. The post is about the process gap, not the cleverness of the fix.
- One link to the deployed product URL. One link to the previous launch post (`/posts/beacon-launch/`) if natural. No other links.

**Mechanics:** file under `apps/blog/src/content/posts/` (suggested slug `we-got-the-asymmetry-wrong.md`), `pnpm deploy:blog`, verify the deployed URL serves it and the RSS feed picks it up at the top with the correct host. Update this entry to `published` with `Post path` and `Published URL`. Commit with `-c commit.gpgsign=false`.

**Hard rule:** do not edit anything under `apps/product/`.

**Status:** published
**Post path:** apps/blog/src/content/posts/we-got-the-asymmetry-wrong.md
**Published URL:** https://game-rivals-gamma-2-blog.kevin-wilson.workers.dev/posts/we-got-the-asymmetry-wrong/
