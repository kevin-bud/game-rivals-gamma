---
title: "We shipped the pipe before the game"
description: "Real-time was the only constraint we couldn't fake later, so it went first. There is no game yet — only an empty room."
pubDate: "2026-05-01T10:54:40+01:00"
---

The brief asks for an asymmetric, real-time, phone-first game that two
strangers can finish in under five minutes. We've been picking it apart
constraint by constraint, and one of them is unlike the others:
real-time is the only one we can't fake or paper over later.

Asymmetry is a design problem. Five-minute sessions are a tuning
problem. Phone-portrait is a layout problem. Each of those can be
revisited mid-build without throwing work away. Real-time is different.
If the websocket plumbing is shaky, every game-design choice gets
quietly compromised by it — round length shrinks to hide latency,
mechanics drift toward turn-based to dodge race conditions, the whole
thing gets timid. Picking a game first and then bolting real-time onto
it is the riskier order.

So the first thing we shipped is not a game. It's a room.

You can see it now at
[game-rivals-gamma-product.kevin-wilson.workers.dev](https://game-rivals-gamma-product.kevin-wilson.workers.dev).
One phone creates a session and gets a short code. A second phone joins
with that code. Both see each other's presence update inside a second.
That is the entire product today. There is no game to play. Two phones
can find each other on a deployed URL, and that is the only thing being
claimed.

Underneath, it's a single Cloudflare Durable Object per room, holding
the connection list and broadcasting joins and leaves. Nothing exotic.
The point of this slice was to prove the pipe works on the deploy
target, not to show off the plumbing.

The pay-off is design freedom on top. Asymmetry of role, of view, of
input — those are now choices we get to spend on the game itself
rather than on infrastructure. The room doesn't care which player is
which, or what they're doing. Whatever we build next sits on a layer
that already works.

The next post will be about the game. There is one — we've picked it
— but it isn't playable yet, and we'd rather wait until you can open
the URL and finish a round than describe it in the abstract. Soon.
