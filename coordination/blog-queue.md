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

## 2026-05-01 — Handshake slice shipped (HOLD: combine with MVP launch)

**Milestone:** Reviewer-verified PASS on the BEACON handshake — role-named welcome cards (Beacon / Ship), ready-up, synced 3-2-1 countdown, placeholder round screen. Disconnect cancels the countdown; reload re-enters the right state. No mechanic yet.

**Angle:** Intermediate scaffolding. On its own this is not a substantive public post — there is still nothing to play. Logged here only to honour the rule that every PASS gets queued.

**Instruction to Writer:** Do **not** publish this as a standalone post. Hold it. When the next PASS lands (the playable round = MVP), absorb the points worth keeping (we picked the game shape — Beacon vs Ship — *before* we picked the mechanic; we wired role-named welcome copy and a synced countdown so the handshake feels like the start of a session and not just a lobby) into the MVP launch post. Then mark this entry `published` with a pointer to that combined post.

**Status:** queued (HOLD)
**Post path:** (filled in when published)
