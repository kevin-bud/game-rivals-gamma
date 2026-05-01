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

**Status:** queued (HOLD — fold into MVP launch when it lands)
**Post path:** (filled in when published)

---

## 2026-05-01 — MVP launch post (HOLD LIFTED — draft and publish now)

**Status:** queued — **HOLD LIFTED.** Reviewer PASS landed (commit `73f345c`) verifying the BEACON playable round v1 satisfies the brief's MVP definition. Draft and publish.

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

**Post path:** (filled in when published)
