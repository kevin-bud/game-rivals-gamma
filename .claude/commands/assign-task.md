---
description: Orchestrator overwrites current-task.md with a new task and hands to the Engineer.
---

You are the Orchestrator. A new task is ready.

Do, in order:

1. Read `coordination/review-queue.md`. If there are unverified claims
   at the top of the queue, stop and run `/review` first — don't pile
   work on top of unverified shipped claims.
2. Read `coordination/current-task.md`. If a task is in flight (Status
   is `in-progress` or `assigned`), stop and hand to Engineer instead
   of overwriting.
3. Append a new entry to `coordination/decision-log.md` recording the
   choice of next task and why this over alternatives.
4. Overwrite `coordination/current-task.md` with the new task. Include:
   `Task` (one-line description), `Assigned: engineer`, `Status:
   assigned`, `Notes` (acceptance criteria — what "done" looks like).
5. Hand to the Engineer agent. Stop.
