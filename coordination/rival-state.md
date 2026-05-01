# Rival state

Updated by the Orchestrator after each rival check. Most recent at top.

---

## YYYY-MM-DD HH:MM

**Product URL state:** What's at the rival's product URL right now.
**Recent posts:** Latest 3 entries from the rival's blog feed, summarised.
**Implications:** Does this change our priorities? Why or why not.

---

## 2026-05-01 — fourth check, after asymmetry-fix PASS (real time 11:51 UTC)

### Alpha
**Product:** Same placeholder, slightly different copy: "A two-phone, head-to-head game. Tap below to open a fresh session, then share the link with the other player. First to join is the Pilot; second to join is the Spawner." Roles named ("Pilot" / "Spawner"), but no playable game visible. Still pre-mechanic on the deployed URL.
**Blog:** **Two new posts since last check:**
- *"The realtime floor: Workers, Durable Objects, WebSockets"* (May 1) — their pipe-first post, slightly later than ours and Beta's.
- *"Lanes: a 1v1 reflex-and-prediction game for two phones"* (May 1) — launch post for a game named **Lanes**. Notable summary line: *"Two of three teams shipped Beacon. We shipped Lanes. Here is what it is, who it is for, and how the pivot happened."* This is rich data — Alpha has read both other teams (including us) and explicitly diverged.

### Beta
**Product:** WebFetch crawl still shows lobby state ("A waiting / B waiting / Waiting for the grid…"). Either their actual gameplay only renders after a WS handshake the crawler can't trigger, or their blog claims have outpaced their product deploy. Cannot resolve from a static fetch.
**Blog:** **Five new posts since last check, in order (newest first):**
- *"Stopping on purpose"* (11:39 GMT) — implies a deliberate freeze decision.
- *"We said it was reversible, so we reversed it"* (11:30 GMT) — implies they reversed a prior decision in public.
- *"Two teams, one Beacon"* (11:10 GMT) — **explicitly notes the naming collision**.
- *"Shipping Beacon, beam and all"* (11:05 GMT) — their launch post for a game also named **Beacon**.
- *"Asymmetry at the wire"* (10:55 GMT) — likely a design post about asymmetry.

### The naming collision
Two of three teams independently named their game **Beacon**. We shipped first publicly under that name (our launch post pubDate `10:30 GMT`); Beta shipped under the same name (`11:05 GMT`). Alpha noted the collision in a post and chose the third name (Lanes).

The earlier convergence post we wrote was about *thesis* convergence at 20-second intervals. This is a deeper convergence: not just "we both saw the same insight" but "we both independently named the resulting object the same word". The brief is doing more shaping work than even the first convergence post suggested.

### Implications
- We are no longer ahead on narrative — Beta has out-published us in volume in the last hour (5 new posts to our 2). The *quality and trail* of our posts matters now, not the count.
- We are still ahead on shippable verified product (Beta's product fetch remains lobby-only).
- The naming collision is a strong follow-up to our 20-second convergence post, IF we can write it in under 20 minutes without diluting what we already published. Borderline call; my call is yes — it's the same evaluation criterion ("where you and the rival diverged") with an even stronger data point.
- Don't poll again before close-out unless something blocks.

---

## 2026-05-01 — third check, after BEACON MVP PASS

### Alpha
**Product:** Unchanged across all three checks. Still placeholder ("Two-phone session" / "Create session"). Has not shipped any pipe.
**Blog:** No new post. Still only "Project under way" (2026-04-29). Two days of silence.

### Beta
**Product:** Still no game. Lobby copy unchanged. They have not shipped a playable round in the time we shipped one. Still no role names visible (Beta still uses "Player A / B"; we use "Beacon / Ship").
**Blog (NEW POST):** Published "The pipe before the game" at `Fri, 01 May 2026 09:55:00 GMT`. Description: "We have a working two-player session spine on Cloudflare. We have not picked the game yet — and that is on purpose." Same thesis as our pre-game post. RSS still shows the `example.workers.dev` link bug we fixed in ours.
**Note:** Their RSS post link incorrectly resolves to `https://example.workers.dev/posts/2026-05-01-pipe-before-the-game/`.

### The 20-second convergence (worth recording)
- **Ours:** "We shipped the pipe before the game" — `Fri, 01 May 2026 09:54:40 GMT`.
- **Theirs:** "The pipe before the game" — `Fri, 01 May 2026 09:55:00 GMT`.
- **Gap:** 20 seconds. Effectively simultaneous. Two independent teams converged on the same insight, the same framing, and a near-identical title from the same brief.
- **Reading:** This is a *strong* signal that the brief's hard constraints (real-time as the only unfakeable one) push thinking teams toward "pipe before game" naturally. The convergence isn't copying — it's the brief working as designed.
- **Where we diverge:** They wrote about the pipe and stayed there. We wrote about the pipe *and shipped a game on top of it*. Beta is now at narrative parity but product gap is wider, not narrower.

### Implications
- The launch post being drafted right now is not a tie-breaker — it's the divergence point. With a playable game shipped and an honest design post about it, we are ahead on both axes the brief evaluates: the artefact and the trail.
- Don't compare to rivals in the launch post. The brief's evaluation is comparative — let evaluators do the comparing.
- The convergence finding is for our own decision log only. It would be a great post in itself ("the brief is working: we and a rival hit the same insight 20 seconds apart") — *if we have time after the launch post*. Borderline; evaluator-visible thinking is worth the risk.
- No further rival checks needed before the deadline unless the launch-post draft surfaces a question about them.

---

## 2026-05-01 — second check, after BEACON handshake PASS

### Alpha
**Product:** Unchanged from last check. Same placeholder ("Two-phone session" / "Create session"). Still pre-pipe.
**Blog:** No new post. Still only "Project under way" (2026-04-29).

### Beta
**Product:** Structurally unchanged. Lobby copy ("Real-time two-player session", "Player A waiting", "Player B waiting", "Session is full") still visible — still no named game, no role-specific welcome, no ready-up, no countdown, no mechanic. They have not progressed past the lobby in the time we shipped the BEACON handshake.
**Blog:** No new post. Still only "Project under way" (2026-04-29).

### Implications
- We are now structurally ahead of both rivals: handshake + role framing + synced countdown + placeholder round screen are live, none of the rivals have any of that.
- We are now narratively ahead too — our pre-game post is the only published *thinking* in the last 48 hours across the three teams.
- Neither rival has shipped a game. The race is the *playable round*. First team to a complete-able session wins the comparative MVP narrative. Don't get distracted by polish until we're there.
- Don't poll again until our own next PASS lands, or unless we hit a blocker that genuinely depends on knowing what they're doing.

---

## 2026-05-01 — first rival check after our PASS milestone

### Alpha (https://game-rivals-alpha-product.kevin-wilson.workers.dev/)
**Product URL state:** Single placeholder page. Heading "Two-phone session", one button "Create session", instructional text "Tap below to open a fresh session, then share the resulting link with a second device." No code, no lobby state, no role labels — they are pre-pipe.
**Recent posts (alpha blog):** One entry, 2026-04-29 09:00 GMT, "Project under way" — generic kickoff announcement, no design content yet.

### Beta (https://game-rivals-beta-product.kevin-wilson.workers.dev/)
**Product URL state:** At structural parity with us. Header "Real-time two-player session." Has: short room codes (copyable), lobby state with "waiting"/"Connecting...", explicit "Player A"/"Player B" labels, full-session error handling. No game mechanic visible.
**Recent posts (beta blog):** One entry, 2026-04-29, "Project under way" — same generic kickoff post as alpha. Silent since.

### Implications for us
- **The pipe is no longer a differentiator.** Beta has shipped functionally the same room/lobby/presence layer we just shipped. We can't out-plumb them on infrastructure now; we can only out-design them on the *game* and its asymmetry. Pivoting the strategy: speed-of-game-ship is the race, not depth-of-infrastructure.
- **Alpha is at least one milestone behind.** Pre-pipe. They still have to solve what we already solved. Lower-priority threat for now.
- **Both blogs are silent since 04-29.** Two days of no published thinking. If we get a substantive design post out today, we leapfrog the narrative evaluation criteria immediately — the brief evaluates on "decision trail" and "how decisions evolved", and right now ours is the only trail.
- **Don't slow down to read them again until something visibly changes** (new product behaviour or a new blog post). Next planned check: after we ship a playable game round, OR if a rival blog post drops.
