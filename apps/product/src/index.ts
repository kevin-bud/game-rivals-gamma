// BEACON — co-op asymmetric room. The Beacon (slot A) sees the sea and
// flashes signals; the Ship (slot B) sails blind through fog. This file
// owns the full round: handshake, ready-up, synced 3-2-1 countdown, the
// playable lane-and-gate round, end-of-round screen, and "Another go"
// rematch.

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

// Round tuning. 18 gates × ~1.7s = ~30s. Tweak here.
const GATE_COUNT = 18;
const DEFAULT_GATE_INTERVAL_MS = 1700;
// Lead-in before the first gate arrives — gives the ship a chance to
// orient on the first cue without an instant hit.
const ROUND_LEAD_IN_MS = 2000;
const HIT_LIMIT = 3;

// Test hook: WS URL accepts ?test_seed=<n> to force the gate seed and
// ?test_tempo=<ms> to accelerate the gate interval. These exist purely to
// make the e2e spec deterministic and fast — the client never sets them
// in production. The `?role=` parameter is the only thing real clients pass.
const MIN_TEST_TEMPO_MS = 200;

type Lane = "L" | "M" | "R";
type Slot = "A" | "B";
type Phase = "welcome" | "countdown" | "round" | "result";
type Result = "playing" | "won" | "lost";

type Gate = {
  lane: Lane;
  arrivesAt: number;
};

type Cue = {
  direction: Lane;
  sentAt: number;
};

type SlotState = {
  connected: boolean;
  ready: boolean;
  playAgain: boolean;
};

type SocketRecord = {
  socket: WebSocket;
  slot: Slot;
};

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

      /* Round + result screens — full-bleed sea. */
      .round-screen {
        position: fixed;
        inset: 0;
        background: #0b1626;
        color: white;
        display: flex;
        flex-direction: column;
        z-index: 10;
        overflow: hidden;
      }

      /* Top HUD bar with hits + role tag. */
      .hud {
        flex-shrink: 0;
        padding: 0.75rem 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        background: rgba(255,255,255,0.05);
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .hud .role-tag {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        opacity: 0.7;
      }
      .hits {
        display: flex;
        gap: 0.4rem;
      }
      .hit-pip {
        width: 1rem;
        height: 1rem;
        border-radius: 50%;
        border: 1.5px solid rgba(255,255,255,0.5);
      }
      .hit-pip.taken {
        background: #cc3333;
        border-color: #cc3333;
      }

      /* Sea panel — the scrolling lane area. */
      .sea {
        flex: 1 1 auto;
        position: relative;
        overflow: hidden;
        background: linear-gradient(#0b1626 0%, #122440 100%);
      }
      .sea.flash-hit {
        animation: flashHit 350ms ease-out;
      }
      @keyframes flashHit {
        0% { background: #cc3333; }
        100% { background: linear-gradient(#0b1626 0%, #122440 100%); }
      }
      .lane-divider {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;
        background: rgba(255,255,255,0.12);
      }
      .lane-divider.one { left: 33.333%; }
      .lane-divider.two { left: 66.666%; }

      /* Beacon view: full vertical map of gates scrolling top → bottom. */
      .beacon-gate {
        position: absolute;
        left: 0;
        right: 0;
        height: 1.2rem;
        display: flex;
        pointer-events: none;
      }
      .beacon-gate .lane-cell {
        flex: 1 1 0;
        border-top: 4px solid #cc4444;
        border-bottom: 4px solid #cc4444;
        background: rgba(204,68,68,0.25);
      }
      .beacon-gate .lane-cell.open {
        border-color: transparent;
        background: transparent;
      }

      /* Ship view: only the next gate or two are visible. */
      .ship-gate {
        position: absolute;
        left: 0;
        right: 0;
        height: 2.4rem;
        display: flex;
        pointer-events: none;
      }
      .ship-gate .lane-cell {
        flex: 1 1 0;
        border-top: 6px solid #ee5050;
        border-bottom: 6px solid #ee5050;
        background: rgba(238,80,80,0.35);
      }
      .ship-gate .lane-cell.open {
        border-color: transparent;
        background: transparent;
      }

      /* The ship marker — a triangle at the bottom in the current lane. */
      .ship-row {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 4rem;
        display: flex;
        border-top: 1px solid rgba(255,255,255,0.25);
        background: rgba(255,255,255,0.04);
      }
      .ship-row .lane-slot {
        flex: 1 1 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .ship-marker {
        width: 0;
        height: 0;
        border-left: 1.1rem solid transparent;
        border-right: 1.1rem solid transparent;
        border-bottom: 1.7rem solid #ffe066;
        transition: transform 120ms ease-out;
      }
      .ship-marker.flash-hit {
        animation: shipFlashHit 350ms ease-out;
      }
      @keyframes shipFlashHit {
        0% { border-bottom-color: #ff4444; transform: scale(1.2); }
        100% { border-bottom-color: #ffe066; transform: scale(1); }
      }

      /* Beacon's cue arrow on Ship's top of sea. */
      .cue-banner {
        position: absolute;
        top: 0.5rem;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 4rem;
        line-height: 1;
        font-weight: 800;
        color: #ffe066;
        text-shadow: 0 0 12px rgba(255,224,102,0.6);
        opacity: 0;
        transition: opacity 200ms ease-out;
        pointer-events: none;
      }
      .cue-banner.visible { opacity: 1; }

      /* Bottom controls bar — three big lane buttons. */
      .controls {
        flex-shrink: 0;
        display: flex;
        gap: 0.5rem;
        padding: 0.5rem;
        background: rgba(0,0,0,0.4);
        border-top: 1px solid rgba(255,255,255,0.1);
      }
      .controls button {
        flex: 1 1 0;
        font-size: 1.4rem;
        font-weight: 800;
        padding: 0.9rem 0;
        border: 0;
        border-radius: 0.6rem;
        background: #233a5c;
        color: white;
        cursor: pointer;
        min-height: 3.2rem;
      }
      .controls button[data-active="true"] {
        background: #2266ee;
        outline: 2px solid #ffe066;
      }

      /* End-of-round screen. */
      .result-screen {
        position: fixed;
        inset: 0;
        background: #0b1626;
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem 1.5rem;
        gap: 1.25rem;
        z-index: 11;
        text-align: center;
      }
      .result-screen .verdict {
        font-size: 3.4rem;
        font-weight: 800;
        margin: 0;
        letter-spacing: 0.02em;
      }
      .result-screen .verdict.won { color: #6ee27a; }
      .result-screen .verdict.lost { color: #ee6666; }
      .result-screen .subtitle {
        font-size: 1.15rem;
        opacity: 0.85;
        margin: 0;
        line-height: 1.4;
        max-width: 22rem;
      }
      .result-screen .partner-note {
        font-size: 0.95rem;
        opacity: 0.7;
        margin-top: 0.25rem;
        min-height: 1.4em;
      }
      .result-screen .again-btn {
        font-size: 1.2rem;
        padding: 1rem 2rem;
        border-radius: 0.6rem;
        border: 0;
        background: #2266ee;
        color: white;
        font-weight: 700;
        cursor: pointer;
        min-height: 3.2rem;
        min-width: 12rem;
      }
      .result-screen .again-btn[disabled] {
        background: #555;
        cursor: default;
        opacity: 0.85;
      }
      .result-screen .leave-link {
        color: #9bd0ff;
      }

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
      <div class="hud">
        <div class="role-tag" data-testid="round-role-tag">${role === "A" ? "Beacon" : "Ship"} · room ${code}</div>
        <div class="hits" data-testid="hits" id="hits">
          <span class="hit-pip" data-pip="0"></span>
          <span class="hit-pip" data-pip="1"></span>
          <span class="hit-pip" data-pip="2"></span>
        </div>
      </div>
      <div class="sea" id="sea" data-testid="sea">
        <div class="lane-divider one"></div>
        <div class="lane-divider two"></div>
        <div class="cue-banner" id="cue-banner" data-testid="cue-banner"></div>
        <div id="gates-layer"></div>
        <div class="ship-row">
          <div class="lane-slot"><div class="ship-marker" data-lane-marker="L" id="marker-L"></div></div>
          <div class="lane-slot"><div class="ship-marker" data-lane-marker="M" id="marker-M"></div></div>
          <div class="lane-slot"><div class="ship-marker" data-lane-marker="R" id="marker-R"></div></div>
        </div>
      </div>
      <div class="controls" data-testid="controls">
        <button type="button" data-lane="L" data-testid="lane-L" onclick="sendInput('L')">L</button>
        <button type="button" data-lane="M" data-testid="lane-M" onclick="sendInput('M')">M</button>
        <button type="button" data-lane="R" data-testid="lane-R" onclick="sendInput('R')">R</button>
      </div>
    </div>

    <div id="result-view" class="result-screen hidden" data-testid="result-view">
      <h2 class="verdict" data-testid="result-verdict" id="verdict">Saved.</h2>
      <p class="subtitle" data-testid="result-subtitle" id="subtitle"></p>
      <p class="partner-note" data-testid="partner-note" id="partner-note"></p>
      <button type="button" class="again-btn" id="again-btn" data-testid="again-button" onclick="sendPlayAgain()">Another go</button>
      <p><a class="leave-link" href="/" data-testid="result-leave-link">Leave</a></p>
    </div>

    <script>
      const code = ${JSON.stringify(code)};
      const role = ${JSON.stringify(role)};
      const otherRole = role === "A" ? "B" : "A";
      const otherName = role === "A" ? "Ship" : "Beacon";

      const welcomeView = document.getElementById("welcome-view");
      const countdownView = document.getElementById("countdown-view");
      const countdownNumberEl = countdownView.querySelector("[data-testid='countdown-number']");
      const roundView = document.getElementById("round-view");
      const resultView = document.getElementById("result-view");
      const presenceEl = document.getElementById("presence");
      const dotEl = document.getElementById("dot");
      const readyBtn = document.getElementById("ready-btn");
      const seaEl = document.getElementById("sea");
      const cueBannerEl = document.getElementById("cue-banner");
      const gatesLayerEl = document.getElementById("gates-layer");
      const hitsEl = document.getElementById("hits");
      const verdictEl = document.getElementById("verdict");
      const subtitleEl = document.getElementById("subtitle");
      const partnerNoteEl = document.getElementById("partner-note");
      const againBtn = document.getElementById("again-btn");
      const markerEls = {
        L: document.getElementById("marker-L"),
        M: document.getElementById("marker-M"),
        R: document.getElementById("marker-R"),
      };
      const laneButtons = {
        L: document.querySelector("[data-lane='L']"),
        M: document.querySelector("[data-lane='M']"),
        R: document.querySelector("[data-lane='R']"),
      };

      let ws;
      let backoff = 500;
      let countdownRafId = null;
      let countdownStartsAt = null;
      let renderRafId = null;
      // Mirror of the latest server state.
      let lastState = null;
      // Track the most recent hits count so we can flash on increase.
      let lastHits = 0;
      // Track the most recent cue we rendered so the banner only re-shows
      // for genuinely new cues.
      let lastCueAt = 0;
      let cueHideTimeout = null;

      const showOnly = (which) => {
        welcomeView.classList.toggle("hidden", which !== "welcome");
        countdownView.classList.toggle("hidden", which !== "countdown");
        roundView.classList.toggle("hidden", which !== "round");
        resultView.classList.toggle("hidden", which !== "result");
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

        if (!other.connected) {
          setPresence("waiting", "Waiting for the " + otherName + " to join…");
        } else if (other.ready) {
          setPresence("connected", "The " + otherName + " is ready.");
        } else {
          setPresence("connected", "Waiting for the " + otherName + " to be ready.");
        }

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
          countdownRafId = requestAnimationFrame(tickCountdown);
          return;
        }
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

      const cancelRoundLoop = () => {
        if (renderRafId !== null) {
          cancelAnimationFrame(renderRafId);
          renderRafId = null;
        }
      };

      // Render the gates layer. Beacon sees the whole sequence as a vertical
      // map; Ship sees only the next gate(s). Ship's view is also faster
      // moving (gates compress closer together) for legibility.
      const renderGates = (state, now) => {
        const gates = state.gates;
        if (!gates || gates.length === 0) {
          gatesLayerEl.innerHTML = "";
          return;
        }
        const seaH = seaEl.clientHeight;
        if (seaH === 0) {
          return;
        }

        // The "ship row" is anchored to the bottom of the sea. Gates that
        // arrive at the ship line up with that row's top edge.
        const shipRowTop = seaH - 64; // matches .ship-row height (4rem ≈ 64px)
        gatesLayerEl.innerHTML = "";

        if (role === "A") {
          // Beacon: project the entire round across the available height.
          // The gate scheduled latest sits at y=0 (top), the gate due now
          // sits at y=shipRowTop. We use roundStartedAt as the timeline
          // anchor so reload reproduces the same on-screen positions.
          const last = gates[gates.length - 1];
          const totalSpanMs = last.arrivesAt - state.roundStartedAt;
          if (totalSpanMs <= 0) {
            return;
          }
          const pxPerMs = shipRowTop / totalSpanMs;
          for (const gate of gates) {
            const dueIn = gate.arrivesAt - now;
            // Gate position: gates due now are at shipRowTop; gates due
            // later are above (smaller y).
            const y = shipRowTop - dueIn * pxPerMs;
            if (y < -20 || y > shipRowTop + 4) {
              continue;
            }
            gatesLayerEl.appendChild(buildGateEl(gate, y, false));
          }
        } else {
          // Ship: only render the next two gates. We compress 1.7 seconds
          // of approach into the full sea height so the next gate is clearly
          // visible from a long way off.
          const visibleMs = state.gateInterval * 2;
          for (let i = 0; i < gates.length; i += 1) {
            const gate = gates[i];
            const dueIn = gate.arrivesAt - now;
            if (dueIn < -200 || dueIn > visibleMs) {
              continue;
            }
            const fraction = dueIn / visibleMs; // 1 = far, 0 = at ship
            const y = shipRowTop - fraction * shipRowTop;
            gatesLayerEl.appendChild(buildGateEl(gate, y, true));
          }
        }
      };

      const buildGateEl = (gate, y, ship) => {
        const el = document.createElement("div");
        el.className = ship ? "ship-gate" : "beacon-gate";
        el.style.top = (y - (ship ? 12 : 6)) + "px";
        el.dataset.gateLane = gate.lane;
        const lanes = ["L", "M", "R"];
        for (const lane of lanes) {
          const cell = document.createElement("div");
          cell.className = "lane-cell" + (lane === gate.lane ? " open" : "");
          el.appendChild(cell);
        }
        return el;
      };

      const renderShipMarker = (state) => {
        for (const lane of ["L", "M", "R"]) {
          const marker = markerEls[lane];
          marker.style.display = lane === state.shipLane ? "block" : "none";
        }
        for (const lane of ["L", "M", "R"]) {
          laneButtons[lane].setAttribute(
            "data-active",
            lane === state.shipLane ? "true" : "false",
          );
        }
      };

      const renderHits = (state) => {
        const pips = hitsEl.querySelectorAll(".hit-pip");
        for (let i = 0; i < pips.length; i += 1) {
          pips[i].classList.toggle("taken", i < state.hits);
        }
        if (state.hits > lastHits) {
          // Visible feedback on hit.
          seaEl.classList.remove("flash-hit");
          void seaEl.offsetWidth; // restart animation
          seaEl.classList.add("flash-hit");
          for (const lane of ["L", "M", "R"]) {
            const marker = markerEls[lane];
            marker.classList.remove("flash-hit");
            void marker.offsetWidth;
            marker.classList.add("flash-hit");
          }
        }
        lastHits = state.hits;
      };

      const renderCueBanner = (state) => {
        if (role !== "B") {
          return;
        }
        if (!state.latestCue) {
          cueBannerEl.classList.remove("visible");
          cueBannerEl.textContent = "";
          return;
        }
        const arrowFor = (dir) => dir === "L" ? "←" : dir === "R" ? "→" : "↑";
        if (state.latestCue.sentAt !== lastCueAt) {
          lastCueAt = state.latestCue.sentAt;
          cueBannerEl.textContent = arrowFor(state.latestCue.direction);
          cueBannerEl.classList.add("visible");
          if (cueHideTimeout !== null) {
            clearTimeout(cueHideTimeout);
          }
          cueHideTimeout = setTimeout(() => {
            cueBannerEl.classList.remove("visible");
          }, 1500);
        }
      };

      // Ship's lane buttons act as steering. Beacon's lane buttons send
      // cues. Same UI shape on both sides keeps the layout simple.
      const sendInput = (lane) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          return;
        }
        try {
          if (role === "A") {
            ws.send(JSON.stringify({ type: "cue", direction: lane }));
          } else {
            ws.send(JSON.stringify({ type: "lane", lane: lane }));
          }
        } catch (e) {
          // ignore — close handler will retry the connection.
        }
      };
      window.sendInput = sendInput;

      const sendPlayAgain = () => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          return;
        }
        try {
          ws.send(JSON.stringify({ type: "play-again" }));
        } catch (e) {
          // ignore
        }
      };
      window.sendPlayAgain = sendPlayAgain;

      const renderRoundFrame = () => {
        if (!lastState || (lastState.phase !== "round" && lastState.phase !== "result")) {
          renderRafId = null;
          return;
        }
        const now = Date.now();
        renderGates(lastState, now);
        renderRafId = requestAnimationFrame(renderRoundFrame);
      };

      const startRoundLoop = () => {
        cancelRoundLoop();
        renderRafId = requestAnimationFrame(renderRoundFrame);
      };

      const renderResult = (state) => {
        const won = state.result === "won";
        verdictEl.textContent = won ? "Saved." : "Wrecked.";
        verdictEl.classList.toggle("won", won);
        verdictEl.classList.toggle("lost", !won);
        if (role === "A") {
          subtitleEl.textContent = won
            ? "You guided them home."
            : "They went down on your watch.";
        } else {
          subtitleEl.textContent = won
            ? "You made it."
            : "You hit one rock too many.";
        }
        const selfState = state[role.toLowerCase()];
        const otherState = state[otherRole.toLowerCase()];
        if (selfState.playAgain) {
          againBtn.disabled = true;
          againBtn.textContent = "Waiting…";
        } else {
          againBtn.disabled = false;
          againBtn.textContent = "Another go";
        }
        if (otherState.playAgain && !selfState.playAgain) {
          partnerNoteEl.textContent = "The " + otherName + " wants another go.";
        } else if (otherState.playAgain && selfState.playAgain) {
          partnerNoteEl.textContent = "Starting the next round…";
        } else {
          partnerNoteEl.textContent = "";
        }
      };

      // Test hook: expose the latest broadcast state on window so the
      // Playwright spec can steer the Ship deterministically. Real clients
      // never read this; it's a side-effect of being in a browser.
      window.__beaconState = null;

      const handleStateMessage = (msg) => {
        const prevPhase = lastState ? lastState.phase : null;
        lastState = msg;
        window.__beaconState = msg;
        if (msg.phase === "welcome") {
          cancelCountdown();
          cancelRoundLoop();
          lastHits = 0;
          lastCueAt = 0;
          showOnly("welcome");
          renderWelcome();
        } else if (msg.phase === "countdown") {
          cancelRoundLoop();
          lastHits = 0;
          lastCueAt = 0;
          renderWelcome();
          startCountdown(msg.countdownStartsAt);
        } else if (msg.phase === "round") {
          cancelCountdown();
          if (prevPhase !== "round") {
            lastHits = 0;
            lastCueAt = 0;
          }
          showOnly("round");
          renderShipMarker(msg);
          renderHits(msg);
          renderCueBanner(msg);
          startRoundLoop();
        } else if (msg.phase === "result") {
          cancelCountdown();
          // Keep the round loop alive briefly so the final hit registers
          // visually before the result screen takes over.
          cancelRoundLoop();
          renderShipMarker(msg);
          renderHits(msg);
          showOnly("result");
          renderResult(msg);
        }
      };

      const sendReady = () => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          return;
        }
        try {
          ws.send(JSON.stringify({ type: "ready" }));
        } catch (e) {
          // ignore
        }
      };
      window.sendReady = sendReady;

      const copyCode = () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(code).catch(() => {});
        }
      };
      window.copyCode = copyCode;

      // Test hooks: forward ?test_seed= and ?test_tempo= to the WS so the
      // e2e spec can pin a deterministic gate sequence and accelerated
      // tempo. Real clients never set these.
      const pageParams = new URLSearchParams(location.search);
      const wsParams = new URLSearchParams();
      wsParams.set("role", role);
      const seed = pageParams.get("test_seed");
      const tempo = pageParams.get("test_tempo");
      if (seed) {
        wsParams.set("test_seed", seed);
      }
      if (tempo) {
        wsParams.set("test_tempo", tempo);
      }
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const url = proto + "//" + location.host + "/r/" + code + "/ws?" + wsParams.toString();

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
            cancelRoundLoop();
            showOnly("welcome");
            setPresence("closed", msg.reason || "rejected");
          }
        });
        ws.addEventListener("close", () => {
          cancelCountdown();
          cancelRoundLoop();
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

// Tiny xorshift32 PRNG. Six lines, no dep. Deterministic given the seed —
// used so a mid-round reload reproduces the same gate sequence.
const makeRng = (seed: number): (() => number) => {
  let state = seed >>> 0;
  if (state === 0) {
    state = 0x9e3779b1;
  }
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
};

const hashCode = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
};

const generateGates = (
  seed: number,
  startAt: number,
  intervalMs: number,
  count: number,
): Gate[] => {
  const rng = makeRng(seed);
  const lanes: Lane[] = ["L", "M", "R"];
  const gates: Gate[] = [];
  let prev: Lane | null = null;
  for (let i = 0; i < count; i += 1) {
    let lane: Lane = lanes[Math.floor(rng() * 3)];
    // Bias against repeats: if same as previous, re-roll once.
    if (prev !== null && lane === prev) {
      lane = lanes[Math.floor(rng() * 3)];
    }
    prev = lane;
    gates.push({
      lane,
      arrivesAt: startAt + ROUND_LEAD_IN_MS + i * intervalMs,
    });
  }
  return gates;
};

export class Room implements DurableObject {
  private state: DurableObjectState;
  private sockets: Set<SocketRecord> = new Set();
  private exists = false;
  private ready: Record<Slot, boolean> = { A: false, B: false };
  private playAgain: Record<Slot, boolean> = { A: false, B: false };
  private phase: Phase = "welcome";
  private countdownStartsAt: number | null = null;
  private roundTransitionAt: number | null = null;
  // Round state. Reset between rounds.
  private gates: Gate[] = [];
  private gateInterval = DEFAULT_GATE_INTERVAL_MS;
  private nextGateIndex = 0;
  private shipLane: Lane = "M";
  private hits = 0;
  private latestCue: Cue | null = null;
  private result: Result = "playing";
  private roundStartedAt: number | null = null;
  // Pinned by the most recent `?test_seed=` from any connecting socket.
  // The next round's gate sequence will use this seed if set, then clear.
  private pendingTestSeed: number | null = null;
  private pendingTestTempo: number | null = null;

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

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 400 });
    }

    const requestedRoleRaw = url.searchParams.get("role");
    const requestedRole: Slot | null =
      requestedRoleRaw === "A" || requestedRoleRaw === "B" ? requestedRoleRaw : null;

    // Test hooks. See top of file for context.
    const seedRaw = url.searchParams.get("test_seed");
    if (seedRaw !== null) {
      const parsed = Number.parseInt(seedRaw, 10);
      if (Number.isFinite(parsed)) {
        this.pendingTestSeed = parsed >>> 0;
      }
    }
    const tempoRaw = url.searchParams.get("test_tempo");
    if (tempoRaw !== null) {
      const parsed = Number.parseInt(tempoRaw, 10);
      if (Number.isFinite(parsed) && parsed >= MIN_TEST_TEMPO_MS) {
        this.pendingTestTempo = parsed;
      }
    }

    const slot = this.assignSlot(requestedRole);

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    if (slot === null) {
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
      if (type === "lane") {
        const lane = (parsed as { lane?: string }).lane;
        if (lane === "L" || lane === "M" || lane === "R") {
          this.handleLane(slot, lane);
        }
        return;
      }
      if (type === "cue") {
        const direction = (parsed as { direction?: string }).direction;
        if (direction === "L" || direction === "M" || direction === "R") {
          this.handleCue(slot, direction);
        }
        return;
      }
      if (type === "play-again") {
        this.handlePlayAgain(slot);
        return;
      }
    });

    this.broadcastState();

    return new Response(null, { status: 101, webSocket: client });
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    // Countdown → round transition.
    if (
      this.phase === "countdown" &&
      this.roundTransitionAt !== null &&
      now + 50 >= this.roundTransitionAt
    ) {
      this.startRound();
      this.scheduleNextGateAlarm();
      return;
    }
    // Round → evaluate gates that have arrived.
    if (this.phase === "round") {
      this.evaluateDueGates(now);
      if (this.phase === "round") {
        this.scheduleNextGateAlarm();
      }
    }
  }

  private startRound(): void {
    const now = Date.now();
    const seed =
      this.pendingTestSeed !== null
        ? this.pendingTestSeed
        : (Date.now() ^ hashCode(this.state.id.toString())) >>> 0;
    this.gateInterval =
      this.pendingTestTempo !== null ? this.pendingTestTempo : DEFAULT_GATE_INTERVAL_MS;
    // Clear the pending test hooks so a subsequent rematch falls back to
    // production defaults unless the client re-sends them on reconnect.
    this.pendingTestSeed = null;
    this.pendingTestTempo = null;

    this.gates = generateGates(seed, now, this.gateInterval, GATE_COUNT);
    this.nextGateIndex = 0;
    this.shipLane = "M";
    this.hits = 0;
    this.latestCue = null;
    this.result = "playing";
    this.roundStartedAt = now;
    this.phase = "round";
    this.countdownStartsAt = null;
    this.roundTransitionAt = null;
    this.broadcastState();
  }

  private scheduleNextGateAlarm(): void {
    if (this.phase !== "round") {
      return;
    }
    if (this.nextGateIndex >= this.gates.length) {
      // No gates left to evaluate — finish the round.
      this.finishRound("won");
      return;
    }
    const next = this.gates[this.nextGateIndex];
    this.state.storage.setAlarm(next.arrivesAt).catch(() => {
      // ignore
    });
  }

  private evaluateDueGates(now: number): void {
    while (
      this.phase === "round" &&
      this.nextGateIndex < this.gates.length &&
      this.gates[this.nextGateIndex].arrivesAt <= now + 50
    ) {
      const gate = this.gates[this.nextGateIndex];
      this.nextGateIndex += 1;
      if (this.shipLane !== gate.lane) {
        this.hits += 1;
        if (this.hits >= HIT_LIMIT) {
          this.finishRound("lost");
          return;
        }
      }
      // Broadcast incrementally so clients see hits as they happen.
      this.broadcastState();
    }
    if (this.nextGateIndex >= this.gates.length && this.phase === "round") {
      this.finishRound("won");
    }
  }

  private finishRound(verdict: Result): void {
    this.result = verdict;
    this.phase = "result";
    this.playAgain = { A: false, B: false };
    this.state.storage.deleteAlarm().catch(() => {
      // ignore
    });
    this.broadcastState();
  }

  private handleReady(slot: Slot): void {
    if (this.phase !== "welcome") {
      return;
    }
    if (this.ready[slot]) {
      return;
    }
    this.ready[slot] = true;
    if (this.ready.A && this.ready.B && this.bothConnected()) {
      this.beginCountdown();
    }
    this.broadcastState();
  }

  private beginCountdown(): void {
    this.phase = "countdown";
    this.countdownStartsAt = Date.now() + COUNTDOWN_BUFFER_MS;
    this.roundTransitionAt = this.countdownStartsAt;
    this.state.storage.setAlarm(this.countdownStartsAt).catch(() => {
      // ignore
    });
  }

  private handleLane(slot: Slot, lane: Lane): void {
    if (this.phase !== "round" || this.result !== "playing") {
      return;
    }
    // Only the Ship can move. Beacon's lane buttons send cues instead.
    if (slot !== "B") {
      return;
    }
    if (this.shipLane === lane) {
      return;
    }
    this.shipLane = lane;
    this.broadcastState();
  }

  private handleCue(slot: Slot, direction: Lane): void {
    if (this.phase !== "round" || this.result !== "playing") {
      return;
    }
    if (slot !== "A") {
      return;
    }
    this.latestCue = { direction, sentAt: Date.now() };
    this.broadcastState();
  }

  private handlePlayAgain(slot: Slot): void {
    if (this.phase !== "result") {
      return;
    }
    if (this.playAgain[slot]) {
      return;
    }
    this.playAgain[slot] = true;
    if (this.playAgain.A && this.playAgain.B && this.bothConnected()) {
      // Reset for a fresh handshake → countdown → round flow.
      this.ready = { A: true, B: true };
      this.playAgain = { A: false, B: false };
      this.gates = [];
      this.nextGateIndex = 0;
      this.shipLane = "M";
      this.hits = 0;
      this.latestCue = null;
      this.result = "playing";
      this.roundStartedAt = null;
      this.beginCountdown();
    }
    this.broadcastState();
  }

  private handleSlotDisconnect(slot: Slot): void {
    this.ready[slot] = false;
    this.playAgain[slot] = false;
    if (this.phase === "countdown") {
      this.phase = "welcome";
      this.countdownStartsAt = null;
      this.roundTransitionAt = null;
      this.state.storage.deleteAlarm().catch(() => {
        // ignore
      });
      this.ready = { A: false, B: false };
    }
    if (this.phase === "round") {
      // Mid-round disconnect: keep the round alive so a reload can re-enter
      // at the right phase with the right gates timeline, hits, lane, and
      // cue. The DO is the source of truth; the alarm continues firing and
      // gates evaluate against the last-known shipLane (Ship-drop) and the
      // last-known cue stays visible (Beacon-drop). If the survivor wants
      // to abandon they can navigate away; we deliberately do not reset.
      // No alarm change here — the existing setAlarm continues to fire.
    }
    if (this.phase === "result") {
      // Stay in result so the survivor still sees the verdict, but their
      // partner-note will reflect the disconnected state.
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
      playAgain: this.playAgain[slot],
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
    if (this.phase === "round" || this.phase === "result") {
      payload.gates = this.gates;
      payload.gateInterval = this.gateInterval;
      payload.shipLane = this.shipLane;
      payload.hits = this.hits;
      payload.latestCue = this.latestCue;
      payload.result = this.result;
      payload.roundStartedAt = this.roundStartedAt;
    }
    const serialised = JSON.stringify(payload);
    for (const rec of this.sockets) {
      try {
        rec.socket.send(serialised);
      } catch {
        // ignore
      }
    }
  }
}
