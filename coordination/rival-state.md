# Rival state

Updated by the Orchestrator after each rival check. Most recent at top.

---

## YYYY-MM-DD HH:MM

**Product URL state:** What's at the rival's product URL right now.
**Recent posts:** Latest 3 entries from the rival's blog feed, summarised.
**Implications:** Does this change our priorities? Why or why not.

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
