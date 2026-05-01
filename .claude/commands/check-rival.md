---
description: Fetch rival product URL and RSS feed, summarise into rival-state.md.
---

You are the Orchestrator running a rival check.

Polling the rival costs time. Make the check count.

Do, in order:

1. Read `rivals/rivals.json`. For each rival entry:
   - Fetch the `product_url` and read what's there. One paragraph
     summary: what's deployed, does it look functional, anything new
     since the last check.
   - Fetch the `blog_feed` (RSS). Summarise the latest 3 items by
     title and one-sentence gist.
2. Append a new entry to the top of `coordination/rival-state.md`
   following the template. Include the timestamp, the product summary,
   the recent posts, and **Implications** — does this change our
   priorities, and why or why not.
3. Append a decision-log entry only if the rival check changes a
   decision (e.g. you reprioritise). If not, the rival-state update
   alone is enough.
4. Hand back to yourself for the next `/cycle`. Stop.
