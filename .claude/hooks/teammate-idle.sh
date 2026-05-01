#!/usr/bin/env bash
# Stop hook — runs when the assistant tries to stop.
#
# This is the "TeammateIdle" mechanism. When an agent stops, this hook
# blocks the stop and re-prompts the agent with the current state of
# the coordination files, so the team keeps moving without external
# poking.
#
# To prevent infinite loops, Claude Code passes `stop_hook_active: true`
# on the second stop in a single chain — when set, we let the agent
# stop. The hook also bails out if the kill-switch file
# `.claude/hooks/.idle-disabled` exists, so an operator can pause the
# loop without editing settings.json.

set -euo pipefail

INPUT="$(cat)"
STOP_HOOK_ACTIVE="$(printf '%s' "$INPUT" | grep -o '"stop_hook_active"[[:space:]]*:[[:space:]]*true' || true)"

if [[ -n "$STOP_HOOK_ACTIVE" ]]; then
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
if [[ -f "$REPO_ROOT/.claude/hooks/.idle-disabled" ]]; then
  exit 0
fi

REASON='The current goal is in coordination/decision-log.md (most recent entry). The current task is in coordination/current-task.md. The review queue is in coordination/review-queue.md.

Identify the highest-value next action toward the current goal. If the current task is complete and unverified, that is a review. If verified and shipped, the Orchestrator decides what is next. If the goal itself is met, declare a new goal in the decision log.

Take that action. Do not wait for further instruction.'

# Output JSON to block the stop and pass the re-prompt as the reason.
printf '{"decision":"block","reason":%s}\n' "$(printf '%s' "$REASON" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"
