# CLAUDE.md

Operating manual for the agent team. Read once per session, refer back
when unsure.

## The team

Four roles, identical for both rival teams:

- **Orchestrator** — owns the brief, decides what's next, polls the rival.
- **Engineer** — writes code under `apps/product/`.
- **Reviewer** — verifies shipped claims via Playwright against the deployed URL.
- **Writer** — drafts and publishes blog posts at milestones.

Role definitions live in `.claude/agents/`. Each role's file is the
authoritative system prompt for that role; do not duplicate it here.

## The brief

`BRIEF.md` is the single source of truth for what to build. Both rival
teams receive the same brief. The brief is fixed — if you find it
ambiguous, prefer the simplest reading and record the interpretation
in `coordination/decision-log.md` rather than asking for clarification.

## Coordination

Coordination is file-mediated. There is no shared chat. The Markdown
files in `coordination/` are the protocol:

- `decision-log.md` — append-only, Orchestrator only.
- `current-task.md` — single active assignment, overwritten by Orchestrator.
- `review-queue.md` — append-only by Engineer; verdicts written by Reviewer.
- `blog-queue.md` — append-only by Orchestrator; status updated by Writer.
- `rival-state.md` — append-only by Orchestrator after rival checks.

See `coordination/README.md` for full conventions.

## Rival awareness

`rivals/rivals.json` lists the rival's public URLs. Reading the rival's
product or blog at any time is allowed and expected. Polling counts
toward the team's time budget — the Orchestrator decides when to look,
not the other roles.

## Hard rules

These never bend:

1. The Engineer never edits `apps/blog/`. The Writer never edits
   `apps/product/`. The Orchestrator never writes application code.
2. Only the Orchestrator edits `coordination/decision-log.md`.
3. "Shipped" requires a Reviewer PASS verdict on the deployed URL. Local
   success is not shipped.
4. Curly braces on every conditional. ESLint `curly: all` is enforced
   and fails the build otherwise.
5. TypeScript: never `any`, prefer `type` over `interface`, prefer
   named exports.
6. British English in any prose written for humans (blog posts, README,
   role descriptions).
7. Commits are small and frequent — at minimum every 15 minutes of
   active work.
8. Do not sign git commits. If commit signing fails or prompts for a
   key, drop the signature and commit without it (`-c commit.gpgsign=false`
   if needed) rather than getting stuck. Signing is never a blocker.

## Deploy

- Blog: `pnpm deploy:blog` (or `pnpm --filter blog deploy`).
- Product: `pnpm deploy:product` (or `pnpm --filter product deploy`).
- Both must succeed for "shipped" to be true. The blog deploys updates
  to public posts; the product deploys updates to the public app.

## Stack defaults (not decisions)

These are fixed by the template; the agents do not pick them:

- Node 22, pnpm, Turborepo, TypeScript.
- ESLint with `curly: all`, Prettier.
- Cloudflare Workers as the deploy target for both apps.
- Astro 6 for the blog.
- Playwright for the product's e2e tests.

## Stack decisions reserved for the agents

These are not pre-decided. The agents choose based on the brief:

- The product framework (or "no framework — single Worker").
- Persistence (KV, D1, R2, Durable Objects, none).
- Auth, sessions, user model.
- UI library, CSS approach.
- Anything else inside `apps/product/`.

Record each decision in `coordination/decision-log.md` with rationale.

## Slash commands

- `/kickoff` — read the brief, log initial reading, assign first task.
- `/cycle` — Orchestrator's main loop.
- `/assign-task` — Orchestrator assigns a new task to the Engineer.
- `/review` — dispatch the top of the review queue to the Reviewer.
- `/post` — dispatch the top queued blog entry to the Writer.
- `/check-rival` — fetch rival state and update `rival-state.md`.

## Hook

`Stop` hook (`.claude/hooks/teammate-idle.sh`) re-prompts the agent
when it tries to stop, with a pointer to the current goal and task.
This keeps the team moving without external poking. To disable
temporarily, `touch .claude/hooks/.idle-disabled`.

Loop-detection is a convention (`.claude/hooks/loop-detection.md`),
not a real hook — see that file if you want to wire it up.

## When in doubt

Read the role file. Read `coordination/decision-log.md`. The
information is there — re-reading is cheaper than guessing.
