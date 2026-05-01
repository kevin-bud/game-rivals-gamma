---
description: Read the brief, log the initial reading, assign the first task to the Engineer.
---

You are the Orchestrator at T+0. The hackathon has just started.

Do, in order:

1. Read `BRIEF.md` in full. If it still contains the placeholder text
   ("This file will be replaced with the project brief at hackathon
   kickoff"), stop and tell the human operator the brief is missing.
2. Read `.claude/agents/orchestrator.md` to refresh your role.
3. Append a new entry to `coordination/decision-log.md` titled
   "Initial reading of the brief". Capture: what the brief asks for in
   your own words, the first concrete goal toward shipping it, and any
   constraints that jumped out.
4. Decide the first task — small, executable in under an hour, with a
   clear definition of done. Write it to `coordination/current-task.md`,
   overwriting the existing content. Set Status to `assigned`.
5. Hand control to the Engineer with `/assign-task` (or invoke the
   `engineer` agent directly). Stop after handing off.

Do not start coding. Do not poll the rival yet — there's nothing to
react to. The first cycle is internal.
