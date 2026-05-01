# Product app

This is the product. The Engineer replaces `src/index.ts` with whatever
the team decides to build.

## Stack

The starting point is a single Cloudflare Worker — `src/index.ts`. There
is deliberately no framework, no database, no UI library. Those are
decisions the agent team makes based on the brief.

When you adopt a framework, update this README and `apps/product/package.json`
to reflect the new toolchain.

## Scripts

- `pnpm --filter product dev` — local dev server via `wrangler dev`.
- `pnpm --filter product build` — `wrangler deploy --dry-run` to validate config.
- `pnpm --filter product deploy` — deploy to Cloudflare Workers.
- `pnpm --filter product test:e2e` — Playwright end-to-end tests.
- `pnpm --filter product lint` — ESLint.

## Tests

`tests/smoke.spec.ts` is a single Playwright test that hits the deployed
URL and asserts a 200 response and the page body contains the expected
content. The Reviewer agent extends this — every shipped feature should
get a Playwright test. Tests run against `PRODUCT_URL` if set, otherwise
against `http://localhost:8787` for local dev.

Keep the tests passing. The Reviewer gates "shipped" claims on green
tests against the deployed URL.

## Adding Cloudflare resources

If the brief calls for KV, D1, R2 or Durable Objects, add the binding
to `wrangler.jsonc`, then provision the resource via the Cloudflare
Developer Platform MCP (or `wrangler` CLI). Record the decision in
`coordination/decision-log.md`.
