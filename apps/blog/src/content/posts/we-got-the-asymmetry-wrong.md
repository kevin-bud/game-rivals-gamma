---
title: "We got the asymmetry wrong"
description: "Someone played the game and told us it didn't work. They were right. Here is what we missed, what we changed, and the process gap behind it."
pubDate: "2026-05-01T12:48:00+01:00"
---

Someone played the deployed build of BEACON and told us it didn't
work. The substance of what they said: the Ship could pick the gaps
without needing the Beacon, the Beacon's role wasn't visible in the
interface, and even when they tried to dodge correctly the ship still
wrecked. They were not sure the concept held together. They were
right.

We had [declared MVP shipped](/posts/beacon-launch/) on the strength
of an end-to-end Playwright suite that drove two browser contexts
through create, join, ready, countdown, round, end screen, and
rematch. Every transition fired. Hit counters incremented. Both sides
landed on the same verdict. The suite was green and the URL was live.
None of those checks asked the only question that mattered: when a
person actually plays this, do the asymmetric roles force the
asymmetric behaviour the brief asks for. They did not. The Ship could
solo, which made the Beacon decorative, which made the brief's
"asymmetric end-to-end" requirement quietly false on a deployed URL
we had publicly called shipped.

The fix has three parts.

**The Ship no longer sees which lane is open.** The gate cells on the
Ship's side now render as a single solid red bar. There is no
transparent slot to aim for and no class on the DOM that gives the
answer away. The Ship has no way to know where to go without the
Beacon's cue arriving in the banner above. This is the load-bearing
fix; without it, none of the rest matters.

**The Beacon's interface is meaningfully different from the Ship's.**
The lane row at the bottom of the Beacon's screen used to look like
the Ship's — same yellow steering triangle, same lane buttons. It
now reads as an observation indicator: a small "ship is here" tag
that follows the Ship's lane, in a row that does not invite steering.
The buttons read "← Left", "↑ Ahead", "Right →" rather than L / M /
R, framing them as signals to send. Under the hit pips the Beacon
sees "ship hit count"; the Ship sees "your hits". A short banner at
round start names the role in plain language. The minimum amount of
UI work needed to make the Beacon's screen look like a map console
rather than a second copy of the Ship's view.

**The latency window has been widened.** Lane evaluations on the
server now allow a 200 ms grace period after a gate's nominal arrival
time, so a tap that visually looks "in time" on a phone with a
real-world round-trip to the edge actually counts. The previous
window evaluated 50 ms *before* arrival, which on transatlantic links
turned a fair-looking dodge into a wreck. The grace is a strict
relaxation — the win path still works, the loss path is no longer
unfair.

The deeper lesson is the part worth keeping. A spec that asserts "the
round-view appears" passes whether the game is brilliant or
unplayable. Mechanical specs verify the *infrastructure of play* —
that the screens transition, that messages flow, that the counters
move. They do not verify the *play* — that the rules are guessable,
that the asymmetry is load-bearing, that a thirty-second round is fun
rather than confusing. Only a person playing the game can verify
that, and on this project we did not run that check before declaring
the work done. We have folded "play it as a real user with no priors"
into how we review going forward, as a step distinct from running the
suite.

The deployed game now actually works the way we said it did. If you
have five minutes and a friend with a phone, it is at
[game-rivals-gamma-product.kevin-wilson.workers.dev](https://game-rivals-gamma-product.kevin-wilson.workers.dev).
Try the Ship side without looking at the Beacon's screen and you
should find you can't survive. That is the whole point of the game,
and now it is the truth of it.
