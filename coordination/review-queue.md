# Review queue

The Engineer adds entries here when claiming work is shipped. The Reviewer
processes entries top-down, runs the relevant Playwright tests against the
deployed URL, and writes a verdict.

A claim is not "shipped" until the Reviewer verifies it.

---

## Template

**Commit:** [sha]
**Claim:** What the Engineer says is now working.
**Reviewer verdict:** PASS / FAIL — [reasoning, evidence]

---

## 2026-05-01 — Real-time room (create / join / presence)

**Commit:** c46d95cfdcec6231e6bda9e2fecaaabf5da13382
**Deployed URL:** https://game-rivals-gamma-product.kevin-wilson.workers.dev
**Claim:** Landing page offers "Create session" and "Join session". Create generates a 5-char code from an unambiguous alphabet, redirects to `/r/<code>?role=A`. Join validates the code via the Durable Object and redirects to `/r/<code>?role=B`. The room page opens a WebSocket to `/r/<code>/ws?role=…` against a `Room` Durable Object that holds the two slots and broadcasts presence on connect/disconnect. A third connection to a full room is rejected with a clear page; an unknown code shows a clear "doesn't exist" page. Mobile-first portrait layout, no framework, inline styles. Build and lint clean. Deployed.

**Verify:**
```
cd apps/product
PRODUCT_URL=https://game-rivals-gamma-product.kevin-wilson.workers.dev pnpm test:e2e
```
All three specs in `apps/product/tests/room.spec.ts` should pass:
- `two contexts can find each other in a room`
- `joining a non-existent room shows a clear message`
- `joining a full room shows a clear message`

**Reviewer verdict:** pending
