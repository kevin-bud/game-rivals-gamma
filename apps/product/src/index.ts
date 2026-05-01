// BEACON — co-op asymmetric room. The Beacon (slot A) sees the sea and
// flashes signals; the Ship (slot B) sails blind through fog. This file
// wires the *handshake into a game*: role-named welcome, ready-up,
// synced 3-2-1 countdown, and a placeholder round screen. The mechanic
// itself is the next slice.

export type Env = {
  ROOM: DurableObjectNamespace;
};

// Unambiguous alphabet — no 0/O, 1/I/L.
const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 5;

// Buffer between "both ready" and t=0 of the countdown. Long enough for
// a slow socket to deliver the message and the client to render "3" before
// it ticks to "2".
const COUNTDOWN_BUFFER_MS = 3500;

const generateRoomCode = (): string => {
  const bytes = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += ROOM_CODE_ALPHABET[bytes[i] % ROOM_CODE_ALPHABET.length];
  }
  return code;
};

const normaliseCode = (raw: string): string => {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
};

const htmlResponse = (body: string, status = 200): Response => {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
};

const landingPage = (): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>BEACON — two-phone co-op</title>
    <style>
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: system-ui, -apple-system, sans-serif;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        padding: 1.5rem;
        gap: 1.25rem;
        max-width: 28rem;
        margin: 0 auto;
      }
      h1 { font-size: 1.6rem; margin: 0.5rem 0 0; letter-spacing: 0.05em; }
      p.lede { margin: 0; opacity: 0.85; line-height: 1.5; }
      form { display: flex; flex-direction: column; gap: 0.75rem; margin: 0; }
      label { font-weight: 600; font-size: 0.95rem; }
      input[type=text] {
        font-size: 1.5rem;
        padding: 0.9rem 1rem;
        border-radius: 0.6rem;
        border: 1px solid #888;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        width: 100%;
      }
      button {
        font-size: 1.1rem;
        padding: 1rem;
        border-radius: 0.6rem;
        border: 0;
        background: #2266ee;
        color: white;
        font-weight: 600;
        cursor: pointer;
        min-height: 3rem;
      }
      button.secondary { background: #444; }
      .card {
        border: 1px solid #8884;
        border-radius: 0.75rem;
        padding: 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
    </style>
  </head>
  <body>
    <h1>BEACON</h1>
    <p class="lede">A co-op game for two phones. One of you sees the sea; the other sails through fog. Reach harbour together.</p>
    <form class="card" method="POST" action="/create" data-testid="create-form">
      <label>Start a new round</label>
      <button type="submit" data-testid="create-button">Create session</button>
    </form>
    <form class="card" method="POST" action="/join" data-testid="join-form">
      <label for="code">Join with a code</label>
      <input id="code" name="code" type="text" inputmode="latin" autocomplete="off" autocapitalize="characters" maxlength="6" placeholder="ABCDE" required data-testid="join-input" />
      <button type="submit" class="secondary" data-testid="join-button">Join session</button>
    </form>
  </body>
</html>
`;

const errorPage = (message: string): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>can't join</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 28rem; margin: 0 auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
      a.button { display: inline-block; padding: 0.9rem 1.2rem; border-radius: 0.6rem; background: #2266ee; color: white; text-decoration: none; font-weight: 600; text-align: center; }
      .error { border: 1px solid #cc3333; background: #cc333322; padding: 1rem; border-radius: 0.6rem; }
    </style>
  </head>
  <body>
    <h1>Can't join</h1>
    <p class="error" data-testid="error-message">${message}</p>
    <a class="button" href="/">Back to start</a>
  </body>
</html>
`;

const roomPage = (code: string, role: "A" | "B"): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>BEACON — room ${code}</title>
    <style>
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: system-ui, -apple-system, sans-serif;
        min-height: 100vh;
        max-width: 28rem;
        margin: 0 auto;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .card {
        border: 1px solid #8884;
        border-radius: 0.75rem;
        padding: 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }
      .label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7; }
      .code-row { display: flex; align-items: center; gap: 0.75rem; justify-content: space-between; }
      .code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 1.6rem;
        letter-spacing: 0.2em;
        font-weight: 700;
      }
      .copy-btn {
        font-size: 0.85rem;
        padding: 0.5rem 0.85rem;
        border-radius: 0.5rem;
        border: 1px solid #888;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-weight: 600;
        min-height: 2.4rem;
        flex-shrink: 0;
      }
      .role-card h2 {
        margin: 0;
        font-size: 1.5rem;
        line-height: 1.25;
      }
      .role-card p {
        margin: 0;
        line-height: 1.5;
      }
      .ready-btn {
        font-size: 1.15rem;
        padding: 1rem;
        border-radius: 0.6rem;
        border: 0;
        background: #2266ee;
        color: white;
        font-weight: 700;
        cursor: pointer;
        min-height: 3.2rem;
      }
      .ready-btn[disabled] {
        background: #555;
        cursor: default;
        opacity: 0.85;
      }
      .presence {
        font-size: 1rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }
      .dot { width: 0.8rem; height: 0.8rem; border-radius: 50%; background: #aaa; flex-shrink: 0; }
      .dot.connected { background: #2cb84a; }
      .dot.waiting { background: #e0a82e; }
      .dot.disconnected { background: #cc3333; }
      .dot.closed { background: #888; }
      .leave { font-size: 0.95rem; }
      a { color: inherit; }

      /* Countdown overlay */
      .countdown-screen {
        position: fixed;
        inset: 0;
        background: #000;
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.5rem;
        z-index: 10;
      }
      .countdown-screen .num {
        font-size: 9rem;
        font-weight: 800;
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }
      .countdown-screen .who {
        font-size: 1.4rem;
        font-weight: 600;
        opacity: 0.85;
      }

      /* Round screen (placeholder) */
      .round-screen {
        position: fixed;
        inset: 0;
        background: #0b1626;
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        gap: 1.25rem;
        z-index: 10;
        text-align: center;
      }
      .round-screen h2 {
        margin: 0;
        font-size: 1.8rem;
        font-weight: 700;
      }
      .round-screen .room-tag {
        font-size: 0.85rem;
        opacity: 0.65;
        letter-spacing: 0.15em;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .round-screen a { color: #9bd0ff; }

      .hidden { display: none !important; }
    </style>
  </head>
  <body>
    <div id="welcome-view">
      <div class="card">
        <div class="label">Room code</div>
        <div class="code-row">
          <div class="code" data-testid="room-code">${code}</div>
          <button type="button" class="copy-btn" data-testid="copy-button" onclick="copyCode()">Copy</button>
        </div>
      </div>

      <div class="card role-card" data-testid="role-card">
        <div class="label" data-testid="role">${role === "A" ? "You are the Beacon" : "You are the Ship"}</div>
        <h2 data-testid="role-title">${role === "A" ? "You are the Beacon." : "You are the Ship."}</h2>
        <p data-testid="role-body">${
          role === "A"
            ? "You see the sea. The Ship sails blind. Flash signals to guide them past the rocks and home to harbour."
            : "You sail through fog. The Beacon sees the rocks for you. Watch their signals and steer to harbour."
        }</p>
        <button type="button" class="ready-btn" id="ready-btn" data-testid="ready-button" onclick="sendReady()">I'm ready</button>
      </div>

      <div class="card">
        <div class="label">${role === "A" ? "The Ship" : "The Beacon"}</div>
        <div class="presence">
          <span class="dot waiting" data-testid="presence-dot" id="dot"></span>
          <span data-testid="presence-text" id="presence">connecting…</span>
        </div>
      </div>

      <p class="leave"><a href="/" data-testid="leave-link">Leave room</a></p>
    </div>

    <div id="countdown-view" class="countdown-screen hidden" data-testid="countdown-view">
      <div class="who" data-testid="countdown-label">Get ready, ${role === "A" ? "Beacon" : "Ship"}</div>
      <div class="num" data-testid="countdown-number">3</div>
    </div>

    <div id="round-view" class="round-screen hidden" data-testid="round-view">
      <h2 data-testid="round-title">${role === "A" ? "Beacon view — coming next." : "Ship view — coming next."}</h2>
      <div class="room-tag">Room <span data-testid="round-room-code">${code}</span></div>
      <p><a href="/" data-testid="round-leave-link">Leave</a></p>
    </div>

    <script>
      const code = ${JSON.stringify(code)};
      const role = ${JSON.stringify(role)};
      const otherRole = role === "A" ? "B" : "A";
      const selfName = role === "A" ? "Beacon" : "Ship";
      const otherName = role === "A" ? "Ship" : "Beacon";

      const welcomeView = document.getElementById("welcome-view");
      const countdownView = document.getElementById("countdown-view");
      const countdownNumberEl = countdownView.querySelector("[data-testid='countdown-number']");
      const roundView = document.getElementById("round-view");
      const presenceEl = document.getElementById("presence");
      const dotEl = document.getElementById("dot");
      const readyBtn = document.getElementById("ready-btn");

      let ws;
      let backoff = 500;
      let countdownRafId = null;
      let countdownStartsAt = null;
      // Mirror of the latest server state, used to render the welcome card.
      let lastState = null;

      const showOnly = (which) => {
        welcomeView.classList.toggle("hidden", which !== "welcome");
        countdownView.classList.toggle("hidden", which !== "countdown");
        roundView.classList.toggle("hidden", which !== "round");
      };

      const setPresence = (state, text) => {
        dotEl.className = "dot " + state;
        presenceEl.textContent = text;
      };

      const renderWelcome = () => {
        if (!lastState) {
          setPresence("waiting", "connecting…");
          return;
        }
        const other = lastState[otherRole.toLowerCase()];
        const selfState = lastState[role.toLowerCase()];

        // Other-side presence text.
        if (!other.connected) {
          setPresence("waiting", "Waiting for the " + otherName + " to join…");
        } else if (other.ready) {
          setPresence("connected", "The " + otherName + " is ready.");
        } else {
          setPresence("connected", "Waiting for the " + otherName + " to be ready.");
        }

        // Ready button state.
        if (selfState.ready) {
          readyBtn.disabled = true;
          readyBtn.textContent = "Waiting…";
          readyBtn.setAttribute("data-ready", "true");
        } else {
          readyBtn.disabled = false;
          readyBtn.textContent = "I'm ready";
          readyBtn.setAttribute("data-ready", "false");
        }
      };

      const cancelCountdown = () => {
        if (countdownRafId !== null) {
          cancelAnimationFrame(countdownRafId);
          countdownRafId = null;
        }
        countdownStartsAt = null;
      };

      const tickCountdown = () => {
        if (countdownStartsAt === null) {
          return;
        }
        const remainingMs = countdownStartsAt - Date.now();
        if (remainingMs <= 0) {
          countdownNumberEl.textContent = "0";
          // Round transition is driven by the server's "round" state, not by
          // a client-side timeout — so just hold on 0 until the server
          // broadcasts the phase change.
          countdownRafId = requestAnimationFrame(tickCountdown);
          return;
        }
        // 3500ms remaining → "3", 2500..1500 → "2", etc.
        const seconds = Math.ceil(remainingMs / 1000);
        const display = String(Math.min(seconds, 3));
        if (countdownNumberEl.textContent !== display) {
          countdownNumberEl.textContent = display;
        }
        countdownRafId = requestAnimationFrame(tickCountdown);
      };

      const startCountdown = (startsAt) => {
        cancelCountdown();
        countdownStartsAt = startsAt;
        countdownNumberEl.textContent = "3";
        showOnly("countdown");
        countdownRafId = requestAnimationFrame(tickCountdown);
      };

      const handleStateMessage = (msg) => {
        lastState = { a: msg.a, b: msg.b };
        if (msg.phase === "welcome") {
          cancelCountdown();
          showOnly("welcome");
          renderWelcome();
        } else if (msg.phase === "countdown") {
          renderWelcome();
          startCountdown(msg.countdownStartsAt);
        } else if (msg.phase === "round") {
          cancelCountdown();
          showOnly("round");
        }
      };

      const sendReady = () => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          return;
        }
        try {
          ws.send(JSON.stringify({ type: "ready" }));
        } catch (e) {
          // ignore — close handler will retry the connection.
        }
      };
      window.sendReady = sendReady;

      const copyCode = () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(code).catch(() => {});
        }
      };
      window.copyCode = copyCode;

      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const url = proto + "//" + location.host + "/r/" + code + "/ws?role=" + role;

      const connect = () => {
        ws = new WebSocket(url);
        ws.addEventListener("open", () => {
          backoff = 500;
        });
        ws.addEventListener("message", (ev) => {
          let msg;
          try { msg = JSON.parse(ev.data); } catch (e) { return; }
          if (msg.type === "state") {
            handleStateMessage(msg);
          } else if (msg.type === "rejected") {
            cancelCountdown();
            showOnly("welcome");
            setPresence("closed", msg.reason || "rejected");
          }
        });
        ws.addEventListener("close", () => {
          // The server is the source of truth — fall back to "welcome" with
          // a disconnected indicator until we reconnect and get fresh state.
          cancelCountdown();
          showOnly("welcome");
          setPresence("disconnected", "Disconnected — retrying…");
          setTimeout(connect, backoff);
          backoff = Math.min(backoff * 2, 5000);
        });
      };

      connect();
    </script>
  </body>
</html>
`;

const FULL_ROOM_MESSAGE = "Room is full — only two players per room.";
const UNKNOWN_ROOM_MESSAGE = "That room code doesn't exist. Ask the Beacon to share their code again.";
const INVALID_CODE_MESSAGE = "Invalid room code.";

const isValidCode = (code: string): boolean => {
  if (code.length < 4 || code.length > 6) {
    return false;
  }
  for (const ch of code) {
    if (!ROOM_CODE_ALPHABET.includes(ch)) {
      return false;
    }
  }
  return true;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === "/" && request.method === "GET") {
      return htmlResponse(landingPage());
    }

    if (pathname === "/create" && request.method === "POST") {
      const code = generateRoomCode();
      const id = env.ROOM.idFromName(code);
      const stub = env.ROOM.get(id);
      // Ensure the DO knows its code (best-effort init); the room is only
      // truly created on first WS connect, but POSTing here also reserves it.
      await stub.fetch(new Request("https://room/init", { method: "POST" }));
      return new Response(null, {
        status: 303,
        headers: { location: `/r/${code}?role=A` },
      });
    }

    if (pathname === "/join" && request.method === "POST") {
      const form = await request.formData();
      const raw = String(form.get("code") ?? "");
      const code = normaliseCode(raw);
      if (!isValidCode(code)) {
        return htmlResponse(errorPage(INVALID_CODE_MESSAGE), 400);
      }
      // Check the room exists and isn't full before redirecting.
      const id = env.ROOM.idFromName(code);
      const stub = env.ROOM.get(id);
      const probe = await stub.fetch(new Request("https://room/probe"));
      const probeJson = (await probe.json()) as { exists: boolean; full: boolean };
      if (!probeJson.exists) {
        return htmlResponse(errorPage(UNKNOWN_ROOM_MESSAGE), 404);
      }
      if (probeJson.full) {
        return htmlResponse(errorPage(FULL_ROOM_MESSAGE), 409);
      }
      return new Response(null, {
        status: 303,
        headers: { location: `/r/${code}?role=B` },
      });
    }

    // /r/<code>/ws — websocket endpoint
    const wsMatch = pathname.match(/^\/r\/([A-Z0-9]{4,6})\/ws$/);
    if (wsMatch) {
      const code = wsMatch[1];
      if (!isValidCode(code)) {
        return new Response("invalid code", { status: 400 });
      }
      const id = env.ROOM.idFromName(code);
      const stub = env.ROOM.get(id);
      return stub.fetch(request);
    }

    // /r/<code> — room page
    const roomMatch = pathname.match(/^\/r\/([A-Z0-9]{4,6})\/?$/);
    if (roomMatch && request.method === "GET") {
      const code = roomMatch[1];
      if (!isValidCode(code)) {
        return htmlResponse(errorPage(INVALID_CODE_MESSAGE), 400);
      }
      const role = url.searchParams.get("role") === "A" ? "A" : "B";
      return htmlResponse(roomPage(code, role));
    }

    return new Response("not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

type Slot = "A" | "B";
type Phase = "welcome" | "countdown" | "round";

type SocketRecord = {
  socket: WebSocket;
  slot: Slot;
};

type SlotState = {
  connected: boolean;
  ready: boolean;
};

export class Room implements DurableObject {
  private state: DurableObjectState;
  private sockets: Set<SocketRecord> = new Set();
  private exists = false;
  private ready: Record<Slot, boolean> = { A: false, B: false };
  private phase: Phase = "welcome";
  // Server-issued unix-ms at which both clients should display "0".
  private countdownStartsAt: number | null = null;
  // Alarm token so a reschedule cancels in-flight transitions.
  private roundTransitionAt: number | null = null;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/init" && request.method === "POST") {
      this.exists = true;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      });
    }

    if (url.pathname === "/probe") {
      const slotsTaken = this.countSlotsTaken();
      return new Response(
        JSON.stringify({ exists: this.exists, full: slotsTaken >= 2 }),
        { headers: { "content-type": "application/json" } },
      );
    }

    // Anything else with an Upgrade header is treated as a WS connect.
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 400 });
    }

    const requestedRoleRaw = url.searchParams.get("role");
    const requestedRole: Slot | null =
      requestedRoleRaw === "A" || requestedRoleRaw === "B" ? requestedRoleRaw : null;

    const slot = this.assignSlot(requestedRole);

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    if (slot === null) {
      // Reject: room is full. Accept the socket only to send a clean message.
      server.accept();
      try {
        server.send(JSON.stringify({ type: "rejected", reason: FULL_ROOM_MESSAGE }));
      } catch {
        // ignore
      }
      server.close(1008, "room full");
      return new Response(null, { status: 101, webSocket: client });
    }

    this.exists = true;
    server.accept();

    // If a previous socket for this slot is still in our set (e.g. the page
    // reloaded before the close event landed), drop it.
    for (const existing of [...this.sockets]) {
      if (existing.slot === slot) {
        try {
          existing.socket.close(1000, "replaced");
        } catch {
          // ignore
        }
        this.sockets.delete(existing);
      }
    }

    const record: SocketRecord = { socket: server, slot };
    this.sockets.add(record);

    server.addEventListener("close", () => {
      const wasPresent = this.sockets.delete(record);
      if (!wasPresent) {
        return;
      }
      this.handleSlotDisconnect(slot);
    });
    server.addEventListener("error", () => {
      const wasPresent = this.sockets.delete(record);
      if (!wasPresent) {
        return;
      }
      this.handleSlotDisconnect(slot);
    });
    server.addEventListener("message", (ev) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(typeof ev.data === "string" ? ev.data : "");
      } catch {
        return;
      }
      if (!parsed || typeof parsed !== "object") {
        return;
      }
      const type = (parsed as { type?: string }).type;
      if (type === "ping") {
        try {
          server.send(JSON.stringify({ type: "pong" }));
        } catch {
          // ignore
        }
        return;
      }
      if (type === "ready") {
        this.handleReady(slot);
        return;
      }
    });

    // Send initial state to the new socket and notify the peer.
    this.broadcastState();

    return new Response(null, { status: 101, webSocket: client });
  }

  async alarm(): Promise<void> {
    // The countdown alarm fires once countdownStartsAt is reached. Promote
    // the room to the round phase if we're still in countdown.
    const now = Date.now();
    if (
      this.phase === "countdown" &&
      this.roundTransitionAt !== null &&
      now + 50 >= this.roundTransitionAt
    ) {
      this.phase = "round";
      this.countdownStartsAt = null;
      this.roundTransitionAt = null;
      this.broadcastState();
    }
  }

  private handleReady(slot: Slot): void {
    if (this.phase !== "welcome") {
      // Ignore late ready presses once the countdown or round has begun.
      return;
    }
    if (this.ready[slot]) {
      return;
    }
    this.ready[slot] = true;
    if (this.ready.A && this.ready.B && this.bothConnected()) {
      this.phase = "countdown";
      this.countdownStartsAt = Date.now() + COUNTDOWN_BUFFER_MS;
      this.roundTransitionAt = this.countdownStartsAt;
      // Schedule a transition to "round" at countdownStartsAt. Use a DO alarm
      // so the transition fires even if no message arrives meanwhile.
      this.state.storage.setAlarm(this.countdownStartsAt).catch(() => {
        // ignore — broadcast still happens.
      });
    }
    this.broadcastState();
  }

  private handleSlotDisconnect(slot: Slot): void {
    // Any disconnect resets that slot's ready flag, cancels any in-flight
    // countdown, and returns the room to welcome. The other side re-renders
    // immediately based on the broadcast.
    this.ready[slot] = false;
    if (this.phase === "countdown") {
      this.phase = "welcome";
      this.countdownStartsAt = null;
      this.roundTransitionAt = null;
      this.state.storage.deleteAlarm().catch(() => {
        // ignore
      });
      // If the other side had also pressed ready, keep their flag — no, the
      // task spec says reset on disconnect during countdown so both go back
      // to welcome cleanly. Reset both.
      this.ready.A = false;
      this.ready.B = false;
    }
    if (this.phase === "round") {
      // If the round was in flight and a side drops, fall back to welcome so
      // the remaining player can re-handshake when their partner returns.
      this.phase = "welcome";
      this.ready.A = false;
      this.ready.B = false;
      this.countdownStartsAt = null;
    }
    this.broadcastState();
  }

  private bothConnected(): boolean {
    return this.isSlotTaken("A") && this.isSlotTaken("B");
  }

  private countSlotsTaken(): number {
    const taken = new Set<Slot>();
    for (const rec of this.sockets) {
      taken.add(rec.slot);
    }
    return taken.size;
  }

  private isSlotTaken(slot: Slot): boolean {
    for (const rec of this.sockets) {
      if (rec.slot === slot) {
        return true;
      }
    }
    return false;
  }

  private assignSlot(requested: Slot | null): Slot | null {
    if (requested !== null) {
      if (!this.isSlotTaken(requested)) {
        return requested;
      }
      // Requested slot taken — try the other one before giving up.
      const other: Slot = requested === "A" ? "B" : "A";
      if (!this.isSlotTaken(other)) {
        return other;
      }
      return null;
    }
    if (!this.isSlotTaken("A")) {
      return "A";
    }
    if (!this.isSlotTaken("B")) {
      return "B";
    }
    return null;
  }

  private slotState(slot: Slot): SlotState {
    return {
      connected: this.isSlotTaken(slot),
      ready: this.ready[slot],
    };
  }

  private broadcastState(): void {
    const payload: Record<string, unknown> = {
      type: "state",
      phase: this.phase,
      a: this.slotState("A"),
      b: this.slotState("B"),
    };
    if (this.phase === "countdown" && this.countdownStartsAt !== null) {
      payload.countdownStartsAt = this.countdownStartsAt;
    }
    const serialised = JSON.stringify(payload);
    for (const rec of this.sockets) {
      try {
        rec.socket.send(serialised);
      } catch {
        // ignore — close handler will clean up.
      }
    }
  }
}
