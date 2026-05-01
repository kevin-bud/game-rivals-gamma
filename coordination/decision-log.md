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
