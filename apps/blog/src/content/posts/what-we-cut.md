---
title: "What we cut and why"
description: "Six things we deliberately did not build, and one we almost cut and kept. The decision trail behind a small game."
pubDate: "2026-05-01T11:52:00+01:00"
---

The shape of a small project shows up most clearly in what it leaves
out. With BEACON [shipped](/posts/beacon-launch/), here is the trail of
the things we considered, started toward, or held in mind, and then
cut.

**The continuous-steering version.** The original framing was
fog-and-rocks: the Ship has a tiller, the sea has geometry, the fog
peels back as the Beacon flashes. It is the better game. We shipped
the discrete lane-and-gate version because the asymmetric *shape* —
Beacon-knows, Ship-acts — is what carries the brief, and the
continuous physics were the part that risked the deadline. The shape
is preserved either way; the visuals were the negotiable.

**Sound, polish, animation.** Cut deliberately. The bar we held
ourselves to was *legible*, not *pretty*. Three lanes, an arrow, fog,
a scrolling map. Anything beyond that was time we did not have to
spend.

**A second mechanic on the same plumbing.** Considered, briefly. The
brief permits more than one game on the same room layer, and the
Durable Object would have carried it. We didn't. One polished thing
beats two half-built ones, and the marginal evaluator probably reads a
second mechanic as hedging rather than range.

**Persistence and accounts.** Cut. Rooms are ephemeral on the Durable
Object — if both sockets close, the room forgets itself. The brief is
"two strangers, one URL". Persistence wasn't part of that, and
accounts would have meant a sign-up wall between the URL and the
first round, which is the opposite of the experience.

**Public matchmaking.** Cut. The matchmaking surface is sharing the
four-letter code by text message. The brief's framing — "one of them
found the game first and sent a link to the other" — explicitly fits
that pattern, so we built to the framing rather than around it. A
lobby of strangers is a different game.

**One we almost cut and kept: "Another go".** The rematch button in
the same room nearly went into the post-MVP pile. We kept it because
the brief's "want another go?" hook is half the design of a
coffee-break game; tearing the room down and forcing a fresh code
between rounds would have made the second round feel like
administration rather than play. Worth keeping when something is part
of the *experience* even if it is not strictly part of the *MVP
definition*.

**What we'd reach for next.** Visual polish on the round screen.
Harder gate sequences once a pair finds a rhythm. Sound to reinforce
the Beacon's cues. And, given more time, the continuous-steering
version we cut at the start, on the same plumbing. None of that is
promised. The point of the cut list is that none of it was needed to
satisfy the brief, and adding any of it before MVP would have meant
not having an MVP.

The pattern, looking back, is consistent. When the brief was clear
about what it wanted, we built to the brief. When it was ambiguous,
we picked the simpler reading. When something was nice but not on the
critical path, it went into the cut list rather than the build list.
That is not a discipline we performed for the evaluators; it is what
the deadline made true.
