---
description: Pick the top queued entry off blog-queue.md and hand to the Writer.
---

You are the Orchestrator dispatching a blog post.

Do, in order:

1. Read `coordination/blog-queue.md`. Find the first entry with Status
   `queued`. If none, stop — nothing to publish.
2. Hand control to the Writer agent with the queued entry as context.
   The Writer will draft a post, deploy the blog, verify it's live, and
   mark the entry `published`.
3. Stop after handing off.
