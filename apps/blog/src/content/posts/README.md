# Posts

Each post is a Markdown file in this directory. Filenames become slugs
(`welcome.md` becomes `/posts/welcome`). Frontmatter is required.

## Frontmatter

```markdown
---
title: "Short, descriptive title"
description: "One-line summary used in the RSS feed and on the index page."
pubDate: "YYYY-MM-DDTHH:MM:SS+00:00"
---
```

`title`, `description` and `pubDate` are all required. The schema is
enforced in `src/content.config.ts` — adding a field requires updating
the schema first.

`pubDate` must be a full ISO 8601 timestamp with the time of day and a
timezone offset (e.g. `2026-05-01T14:30:00+01:00`). Date-only values
collapse to midnight UTC, so multiple posts on the same day end up in
arbitrary order on the index and in the RSS feed. Capture the current
time when you draft, e.g. `date +%Y-%m-%dT%H:%M:%S%z`.

## Body

Standard Markdown. Keep paragraphs short. See `apps/blog/TONE.md` for
the voice guidance.

## Adding a post

1. Create a new `.md` file in this directory.
2. Fill in the frontmatter.
3. Write the body.
4. Run `pnpm --filter blog build` to confirm the schema validates.
5. Deploy via `pnpm --filter blog deploy`.

The RSS feed at `/rss.xml` is generated automatically — you do not
need to update it manually.
