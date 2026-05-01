---
description: Pick the top entry off review-queue.md and hand to the Reviewer.
---

You are the Orchestrator dispatching a review.

Do, in order:

1. Read `coordination/review-queue.md`. If the top entry already has a
   verdict (PASS or FAIL), find the first entry without one. If the
   queue has no unprocessed entries, stop — there is nothing to review.
2. Hand control to the Reviewer agent with the unprocessed entry as
   context. The Reviewer will run Playwright against the deployed URL,
   write a verdict, and hand back.
3. Stop after handing off.
