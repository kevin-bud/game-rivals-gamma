---
title: "BEACON: a co-op game for two strangers and one map"
description: "A two-player asymmetric game playable on a phone in a coffee break. One sees the map. The other sails through fog. Together you reach harbour."
pubDate: "2026-05-01T11:30:00+01:00"
---

The game is live at
[game-rivals-gamma-product.kevin-wilson.workers.dev](https://game-rivals-gamma-product.kevin-wilson.workers.dev).
Open it on a phone, tap **Create**, send the four-letter code to a
friend, and play. A round takes about a minute. You either reach
harbour together or you don't.

One of you is the **Beacon**. You see a top-down map of the next
sequence of gates scrolling toward the ship. You don't steer. Your job
is to flash a direction — left, middle, or right — so the ship knows
where the opening is. The other of you is the **Ship**. You see fog,
the next gate or two, and the giant arrow your Beacon last sent. You
steer with three buttons. You can't see the map. You can't survive
without the cues.

That asymmetry is the whole game. Different views, different controls,
different information, one shared goal. Communication is forced by the
mechanic itself — neither player can win alone, and neither needs a
chat box to play. Two strangers can pick it up because they don't have
to talk much; the game makes them coordinate whether they want to or
not.

## What we aimed for

Not skill mastery. Not strategic depth. Coffee-break co-op — the kind
of fun where two strangers laugh at each other across a 30-second
round and immediately want another go. We made it co-op rather than
adversarial on purpose: you don't lose to your stranger, you lose
*with* them, and the rematch feels obvious rather than awkward. Press
**Another go** in the same room and you keep playing.

We made some bets about who is going to load the URL. They have
varying patience for tutorials, so we didn't write a tutorial — the
welcome screens are the tutorial, two sentences each, role-named so
you know what you are before you know what to do. They are on phones,
not gaming setups, so the input bandwidth on each side is three
buttons. They are not necessarily gamers, so the win condition is
generous and the loss condition is quick.

## What we cut

The original framing was a continuous fog-and-rocks steering game —
the Ship would have a tiller, the sea would have geometry, the fog
would peel back as the Beacon flashed. It is the prettier game. We
shipped a discrete lane-and-gate version instead: three lanes, gates
arriving on a fixed tempo, each with an opening in one of them. The
asymmetric *shape* — Beacon-knows, Ship-acts — is what carries the
game, and that shape is the same in either version. The lane-and-gate
mechanic is the version that ships today; the continuous one is the
version that ships next week, and we did not have next week.

It was also useful that the visual bar for lane-and-gate is "legible".
Three lanes, scrolling map, fog, an arrow. You can tell what is
happening at a glance, on a phone, in portrait, with one thumb. We
spent the hours we would have spent on hit detection and physics on
making the start of a session feel deliberate.

## The shape before the mechanic

Before we picked the mechanic, we picked the shape. The first slice
after the room itself wasn't game logic — it was role-named welcome
cards (Beacon and Ship), a ready-up on each side, and a synced 3-2-1
countdown that both phones run against the same server timestamp. By
the time we built the playable round, the *opening* of a session
already felt like a session rather than a lobby. Two strangers see
their roles named, ready up, watch the same countdown tick down, and
the round starts. It costs almost nothing to build and it carries a
surprising amount of the game.

The plumbing underneath is the room we
[wrote about previously](/posts/pipe-before-the-game/) — a single
Cloudflare Durable Object per session, holding the timeline and
broadcasting state to both phones. The DO is the source of truth for
which gates have passed, which were cleared, and what the score is.
Both clients animate against shared timestamps so the Beacon's map and
the Ship's view stay in lockstep without either client deciding what
"now" is.

## What's next

The MVP is the bar, not the ceiling. The obvious post-MVP work is
visual polish on the round screen, harder gate sequences once a pair
finds a rhythm, sound to reinforce the cues, and — if we get there —
the continuous-steering version we cut, on the same plumbing. None of
that is promised. The game as it stands satisfies the brief: two
strangers, two phones, one short asymmetric round, a clear ending,
another go. Anything beyond that is a bonus.

If you want to read the source, it is at
[github.com/kevin-bud/game-rivals-gamma](https://github.com/kevin-bud/game-rivals-gamma).
Otherwise, the more useful thing to do with the next five minutes is
to send the URL to someone and play a round.
