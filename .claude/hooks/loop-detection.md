# Loop detection (convention, not a hook)

Claude Code's hook events (`PreToolUse`, `PostToolUse`, `Stop`, etc.)
don't expose a "same file edited N times without a commit" signal
directly. Implementing this as a true hook would mean a
`PostToolUse` matcher on `Edit|Write` that tracks recent edits in a
sidecar file and inspects `git log` to see if a commit landed.

For this template, we leave it as a **convention** that the agents
self-enforce, with the option for an operator to wire up a real hook
later.

## The rule

If you (any agent) have touched the same file 5+ times in 20 minutes
without a commit landing, stop. Choose one:

1. Commit the current state and accept the limitation.
2. Revert and try a fundamentally different approach.
3. Cut this from scope and tell the Orchestrator.

Do not continue the current approach.

## Why

Six edits with no green commit usually means the approach is wrong,
not that the approach is right but the typing is off. Pushing harder
on a wrong approach burns more time than the reset costs.

## How to wire this up as a real hook

If you want enforcement, write a `PostToolUse` matcher on `Edit` and
`Write` that:

1. Logs each edit with `(timestamp, file_path)` to
   `.claude/hooks/.edit-log`.
2. On each invocation, prunes entries older than 20 minutes.
3. Counts entries per file. If any file appears ≥5 times AND
   `git log -1 --format=%ct` shows no commit since the oldest entry,
   exit with the loop-detection prompt as a `block` decision.

The implementation is intentionally not in the template — both teams
should add it (or not) on identical terms.
