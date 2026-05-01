// Minimal real-time room: create / join by short code, presence over WS.
// Game mechanic deliberately deferred — this proves the pipe only.

export type Env = {
  ROOM: DurableObjectNamespace;
};

// Unambiguous alphabet — no 0/O, 1/I/L.
const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 5;

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
    <title>two-phone room</title>
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
      h1 { font-size: 1.4rem; margin: 0.5rem 0 0; }
      p.lede { margin: 0; opacity: 0.8; line-height: 1.4; }
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
      hr { border: 0; border-top: 1px solid #8884; margin: 0.25rem 0; }
    </style>
  </head>
  <body>
    <h1>Two-phone room</h1>
    <p class="lede">Create a room, share the code with one other phone, and watch the connection light up.</p>
    <form class="card" method="POST" action="/create" data-testid="create-form">
      <label>Start a new room</label>
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
    <title>room ${code}</title>
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
        gap: 1.25rem;
      }
      .card {
        border: 1px solid #8884;
        border-radius: 0.75rem;
        padding: 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.7; }
      .code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 2.4rem;
        letter-spacing: 0.25em;
        font-weight: 700;
      }
      .role {
        font-size: 1.4rem;
        font-weight: 700;
      }
      .presence {
        font-size: 1.1rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }
      .dot { width: 0.9rem; height: 0.9rem; border-radius: 50%; background: #aaa; flex-shrink: 0; }
      .dot.connected { background: #2cb84a; }
      .dot.waiting { background: #e0a82e; }
      .dot.disconnected { background: #cc3333; }
      .dot.closed { background: #888; }
      button {
        font-size: 1rem;
        padding: 0.75rem;
        border-radius: 0.5rem;
        border: 1px solid #888;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-weight: 600;
        min-height: 2.6rem;
      }
      a { color: inherit; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="label">Room code</div>
      <div class="code" data-testid="room-code">${code}</div>
      <button type="button" data-testid="copy-button" onclick="copyCode()">Copy code</button>
    </div>
    <div class="card">
      <div class="label">You are</div>
      <div class="role" data-testid="role">Player ${role}</div>
    </div>
    <div class="card">
      <div class="label">Other player</div>
      <div class="presence">
        <span class="dot waiting" data-testid="presence-dot" id="dot"></span>
        <span data-testid="presence-text" id="presence">connecting…</span>
      </div>
    </div>
    <p><a href="/">Leave room</a></p>
    <script>
      const code = ${JSON.stringify(code)};
      const role = ${JSON.stringify(role)};
      const presenceEl = document.getElementById("presence");
      const dotEl = document.getElementById("dot");

      const setPresence = (state, text) => {
        dotEl.className = "dot " + state;
        presenceEl.textContent = text;
      };

      const copyCode = () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(code).catch(() => {});
        }
      };
      window.copyCode = copyCode;

      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const url = proto + "//" + location.host + "/r/" + code + "/ws?role=" + role;
      let ws;
      let backoff = 500;

      const connect = () => {
        ws = new WebSocket(url);
        ws.addEventListener("open", () => {
          backoff = 500;
          setPresence("waiting", "waiting…");
        });
        ws.addEventListener("message", (ev) => {
          let msg;
          try { msg = JSON.parse(ev.data); } catch { return; }
          if (msg.type === "presence") {
            if (msg.otherConnected) {
              setPresence("connected", "connected");
            } else {
              setPresence("waiting", "waiting…");
            }
          } else if (msg.type === "rejected") {
            setPresence("closed", msg.reason || "rejected");
          }
        });
        ws.addEventListener("close", () => {
          setPresence("disconnected", "disconnected — retrying…");
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
const UNKNOWN_ROOM_MESSAGE = "That room code doesn't exist. Ask Player A to share their code again.";
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

type SocketRecord = {
  socket: WebSocket;
  slot: Slot;
};

export class Room implements DurableObject {
  private state: DurableObjectState;
  private sockets: Set<SocketRecord> = new Set();
  private exists = false;

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

    const record: SocketRecord = { socket: server, slot };
    this.sockets.add(record);

    server.addEventListener("close", () => {
      this.sockets.delete(record);
      this.broadcastPresence();
    });
    server.addEventListener("error", () => {
      this.sockets.delete(record);
      this.broadcastPresence();
    });
    server.addEventListener("message", (ev) => {
      // No game messages yet — echo back as a relay so the pipe is testable.
      let parsed: unknown;
      try {
        parsed = JSON.parse(typeof ev.data === "string" ? ev.data : "");
      } catch {
        return;
      }
      if (parsed && typeof parsed === "object" && (parsed as { type?: string }).type === "ping") {
        try {
          server.send(JSON.stringify({ type: "pong" }));
        } catch {
          // ignore
        }
      }
    });

    // Send initial presence to the new socket and notify the peer.
    this.broadcastPresence();

    return new Response(null, { status: 101, webSocket: client });
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

  private broadcastPresence(): void {
    const aConnected = this.isSlotTaken("A");
    const bConnected = this.isSlotTaken("B");
    for (const rec of this.sockets) {
      const otherConnected = rec.slot === "A" ? bConnected : aConnected;
      const payload = JSON.stringify({
        type: "presence",
        self: rec.slot,
        selfConnected: true,
        otherConnected,
      });
      try {
        rec.socket.send(payload);
      } catch {
        // ignore — close handler will clean up.
      }
    }
  }
}
