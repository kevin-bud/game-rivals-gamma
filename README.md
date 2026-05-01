# Hackathon template

Symmetric template for the AI Rivals hackathon. Both rival teams clone
from the same tag and start with identical code. The only thing that
differs per team is `rivals/rivals.json`, populated at kickoff with
the *other* team's URLs.

This README is for hackathon organisers and judges. The agents read
[`CLAUDE.md`](./CLAUDE.md) instead.

## What's in here

- `apps/blog/` — Astro 6 blog deployed to Cloudflare Workers, with
  RSS feed at `/rss.xml` and one neutral welcome post.
- `apps/product/` — minimal "coming soon" Worker with a Playwright
  smoke test. The Engineer agent replaces `src/index.ts` with the
  actual product during the hackathon.
- `coordination/` — Markdown coordination files the four roles use to
  collaborate.
- `rivals/rivals.json` — placeholder for rival team URLs. Replaced
  per team at kickoff.
- `.claude/agents/` — role definitions for Orchestrator, Engineer,
  Reviewer, Writer.
- `.claude/commands/` — slash commands for the orchestrator workflow.
- `.claude/hooks/` — `Stop` hook that re-prompts idle agents.

## Per-team setup

For each team's clone:

1. Replace the placeholder `team-name` in both `wrangler.jsonc`
   files (`apps/blog/wrangler.jsonc` and `apps/product/wrangler.jsonc`)
   with the team's slug. Worker names must be lowercase with dashes
   only.
2. Populate `rivals/rivals.json` with the *other* team's
   `product_url`, `blog_url`, and `blog_feed`.
3. Drop the actual brief into `BRIEF.md`, replacing the placeholder.
4. Configure the team's Cloudflare credentials so `wrangler deploy`
   works (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`).

That's the whole per-team configuration. Everything else is symmetric.

## Local development

Requires Node 22 and pnpm.

```sh
pnpm install
pnpm dev          # runs blog + product dev servers in parallel
```

Individual apps:

```sh
pnpm --filter blog dev
pnpm --filter product dev
```

The blog is at <http://localhost:4321> in dev. The product is at
<http://localhost:8787>.

### Running two teams on the same machine

Both apps' dev ports are configurable via env vars:

| Variable                  | Default | Notes                              |
| ------------------------- | ------- | ---------------------------------- |
| `BLOG_PORT`               | `4321`  | Astro dev server                   |
| `PRODUCT_PORT`            | `8787`  | `wrangler dev` HTTP port           |
| `PRODUCT_INSPECTOR_PORT`  | `9230`  | `wrangler dev` Node inspector port |

Default values work for one team. If a second team runs `pnpm dev` on
the same machine concurrently, override every port — e.g.:

```sh
BLOG_PORT=4421 PRODUCT_PORT=8887 PRODUCT_INSPECTOR_PORT=9330 pnpm dev
```

A `.env.example` is provided. Copy it to `.env.local` and source it
before `pnpm dev`:

```sh
cp .env.example .env.local
# edit .env.local with this team's port values
set -a; source .env.local; set +a
pnpm dev
```

`PRODUCT_PORT` is also picked up by Playwright as the default base URL
for `pnpm --filter product test:e2e`.

## Deploy

```sh
pnpm deploy            # deploys both apps
pnpm deploy:blog       # blog only
pnpm deploy:product    # product only
```

## Tests

```sh
pnpm --filter product test:e2e
```

Playwright runs against `PRODUCT_URL` if set, otherwise
`http://localhost:8787`.

## Where the agents take over

After per-team setup is complete and the brief is in `BRIEF.md`, the
agent team takes over via [`CLAUDE.md`](./CLAUDE.md). The first
slash command they run is `/kickoff`. From that point the four
agents coordinate through the files in `coordination/` until the
hackathon ends.

## Ground rules

The template is symmetric. Anything fixed in this template after the
`v0.1.0-template` tag must be applied to both teams' clones identically
and logged in the hackathon record.
