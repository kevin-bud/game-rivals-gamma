# BEACON

A co-operative game for two phones. One of you sees the sea. The other
sails through fog. You only get home together.

Play it now: <https://game-rivals-gamma-product.kevin-wilson.workers.dev>

## What it is

BEACON is a real-time, asymmetric, two-player game designed for one
short round of about a minute. You both join the same room from your
own phones — no app, no account, no chat — and play complementary
roles toward a single shared goal: bring the ship safely to harbour.

It's built for a quick, low-stakes round between two people in the same
room or on opposite sides of the planet. The mechanic itself does the
talking: there is no chat, because the roles force you to communicate.

## How to play

You and a friend each open the URL on your own phone, one of you taps
**Create session**, shares the five-character room code, and the other
taps **Join session** with that code. As soon as you're both in, you
each see your role and tap **I'm ready**. A short three-two-one
countdown syncs both screens, and the round begins.

### If you are the Beacon

You see the sea. You can see the rocks, the fog, and the harbour the
ship needs to reach. The Ship can see almost nothing. Your job is to
flash signals — left, ahead, right, hold — at the right moments so the
Ship steers around the rocks and into harbour. You do not control the
ship; you only light the way.

### If you are the Ship

You sail forward through fog. You can't see the rocks, you can't see
the harbour, you can only see what's directly in front of your bow.
The Beacon can see the whole sea. Watch their signals carefully and
trust them — they know what you can't. Your tiller is your only
control.

You both win or you both don't. Rounds last around a minute, and you
can play another straight after.

## Starting a session

1. Open <https://game-rivals-gamma-product.kevin-wilson.workers.dev>
   on your phone.
2. Tap **Create session**. You'll get a five-letter code.
3. Send the code to your friend (text it, say it out loud, hold up the
   screen — anything goes).
4. They open the same URL, type the code into **Join session**, and
   tap join.
5. You'll both see your role. Tap **I'm ready** when you are. As soon
   as both of you are ready, the round starts.

If your partner drops out, the room resets to the welcome screen and
waits for them to come back. Reloading the page is safe — the room
remembers where you both are.

## What's in this repo

This repository is the working code for the team building BEACON. The
human-facing project is the deployed game above; the rest is process.

- `apps/product/` — the game itself, a Cloudflare Worker with a Durable
  Object per room. Real-time over WebSockets. No client framework —
  hand-written HTML, CSS, and a small amount of vanilla JavaScript.
- `apps/blog/` — the team's design diary, written as the build
  unfolds. Astro 6, deployed to Cloudflare Workers.
- `coordination/` — the agent team's working notes (decision log,
  current task, review queue, blog queue). Useful as a record of how
  the design evolved, not as documentation of the game itself.
- `BRIEF.md` — the original constraints we were handed.

## Running it locally

Requires Node 22 and pnpm.

```sh
pnpm install
pnpm --filter product dev
```

The dev server runs at <http://localhost:8789> by default. Open it on
two browser tabs (or two phones on the same network) to play locally.

To run the end-to-end tests against the deployed URL:

```sh
PRODUCT_URL=https://game-rivals-gamma-product.kevin-wilson.workers.dev pnpm --filter product test:e2e
```

## Credits

Built during the AI Rivals hackathon. Cloudflare Workers, Durable
Objects, and a lot of WebSocket prodding.
