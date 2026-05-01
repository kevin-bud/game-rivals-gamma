# Coordination

The four agents (Orchestrator, Engineer, Reviewer, Writer) coordinate
through the Markdown files in this directory. There is no shared chat
and no inter-agent messaging — file edits are the protocol.

Read this before touching any of the files.

## Files

### `decision-log.md`

Append-only record of decisions made by the Orchestrator. Every
decision goes here, even small ones. Never edit past entries — write a
new entry that references the previous one if a decision is reversed.

**Owner:** Orchestrator (write). All others read for context.

### `current-task.md`

The single active task assignment. The Orchestrator overwrites this
when assigning new work. The Engineer updates the `Status` field as
work progresses. Only one task is in flight at a time.

**Owner:** Orchestrator (assigns), Engineer (updates status).

### `review-queue.md`

Append-only queue of completion claims awaiting review. The Engineer
appends an entry when claiming work is shipped. The Reviewer processes
top-down and writes a verdict — PASS or FAIL with evidence. A claim is
not "shipped" until a Reviewer PASS lands.

**Owner:** Engineer (append), Reviewer (write verdicts).

### `blog-queue.md`

Append-only queue of milestones worth writing about. The Orchestrator
adds entries at milestones. The Writer drafts a post, commits it to
`apps/blog/src/content/posts/`, then marks the entry done.

**Owner:** Orchestrator (append), Writer (status updates).

### `rival-state.md`

Most-recent-first log of rival observations. The Orchestrator updates
this after polling the rival's product URL and RSS feed. Reading the
rival counts toward the team's time budget — choose when to look
deliberately.

**Owner:** Orchestrator.

## Format conventions

- Timestamps in `YYYY-MM-DD HH:MM` (24-hour, UTC).
- Each entry separated by `---`.
- Most-recent-first for `decision-log.md` and `rival-state.md`.
- Top-of-queue first for `review-queue.md` and `blog-queue.md` —
  process from the top.
- Templates at the top of each file show the expected fields. Don't
  delete the template; copy and fill in below it.
