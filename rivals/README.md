# Rivals

`rivals.json` lists the public URLs of any rival teams. The hackathon
organisers populate this file at kickoff with the other team's real
URLs. Until then, it contains placeholders.

## Read-only at runtime

Treat `rivals.json` as read-only. Do not modify it from agent code.

## Reading rivals is allowed

Reading the rival's product URL or blog feed at any time is allowed
and expected. There is no obligation to ignore them.

## Reading rivals counts toward your time budget

Polling the rival is not free. Each fetch is time the team is not
spending shipping. Choose when to look deliberately:

- After a milestone of your own.
- When stuck and considering a strategic change.
- On a regular cadence (e.g. once per cycle).

The Orchestrator decides when to poll. The Writer and Engineer should
not poll independently — that risks duplicate fetches and divergent
interpretations.

## What to record

After each rival check, the Orchestrator updates
`coordination/rival-state.md` with the latest observations and
implications.
