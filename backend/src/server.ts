import express from "express";
import cors from "cors";

const app = express();

// ─── CORS: allow vite dev server + same-origin ───
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:4173",
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,  // local network preview
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));

const PORT = process.env.PORT || 3000;

// ─── State ───
let lastLocation: any = null;
let audioBuffer: any[] = [];
let latestHeading: number | null = null;
let headingSetAt: number = 0;
const serverStartTime = Date.now();

// ─── Helpers ───
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number, dec = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dec));
}

// ─── Health ───
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// ─── Telegram Messages ───
app.get("/api/glasses/messages", (_req, res) => {
  res.json([
    {
      id: 1,
      chat: "SmartGlasses",
      sender: "Michael",
      text: "Testing the glasses HUD",
      timestamp: Date.now() - 60000,
    },
    {
      id: 2,
      chat: "Direct",
      sender: "Macklemore",
      text: "Deployment complete",
      timestamp: Date.now(),
    },
  ]);
});

app.post("/api/glasses/send", (req, res) => {
  const { chat, text, type } = req.body;
  console.log(`[Backend] Send ${type || "telegram"} to ${chat}: ${text}`);
  res.json({ ok: true });
});

// ─── Email ───
app.get("/api/glasses/email", (_req, res) => {
  res.json([
    {
      id: "1",
      from: "investor@example.com",
      subject: "RE: Series A",
      snippet: "Thanks for the update...",
      timestamp: Date.now() - 3600000,
    },
    {
      id: "2",
      from: "team@protelynx.ai",
      subject: "Build passing",
      snippet: "All CI checks green",
      timestamp: Date.now(),
    },
  ]);
});

// ─── Calendar ───
app.get("/api/glasses/calendar", (_req, res) => {
  const today = new Date();
  const d = new Date(today);
  res.json([
    {
      title: "Team Standup",
      start: new Date(d.setHours(9, 0, 0)).toISOString(),
      end: new Date(d.setHours(9, 30, 0)).toISOString(),
    },
    {
      title: "Investor Call",
      start: new Date(d.setHours(14, 0, 0)).toISOString(),
      end: new Date(d.setHours(15, 0, 0)).toISOString(),
      location: "Zoom",
    },
  ]);
});

// ─── Dexcom CGM ───
app.get("/api/glasses/glucose", (_req, res) => {
  const base = rand(95, 140);
  res.json({
    latest: { value: base, trend: "Flat", timestamp: Date.now() - 120000 },
    history: [
      { value: base - 10, trend: "FortyFiveUp", timestamp: Date.now() - 1500000 },
      { value: base - 7, trend: "Flat", timestamp: Date.now() - 1200000 },
      { value: base - 4, trend: "FortyFiveUp", timestamp: Date.now() - 900000 },
      { value: base + 2, trend: "Flat", timestamp: Date.now() - 600000 },
      { value: base - 1, trend: "FortyFiveDown", timestamp: Date.now() - 300000 },
      { value: base, trend: "Flat", timestamp: Date.now() - 120000 },
    ],
  });
});

// ─── Agent Communication (legacy) ───
app.post("/api/glasses/agent-message", (req, res) => {
  const { type, user } = req.body;
  console.log(`[Backend] Agent message from ${user}, type: ${type}`);
  res.json({
    response:
      "Macklemore: All systems green. Rosie: Markets flat. Lenny: No alerts.",
  });
});

app.post("/api/glasses/audio-chunk", (req, res) => {
  audioBuffer.push(req.body.audio);
  res.json({ ok: true });
});

app.get("/api/glasses/agent-status", (_req, res) => {
  res.json({ status: "Mack:✅ Rosie:✅ Winnie:✅ Lenny:✅" });
});

// ─── Agent-First: New Agent API ───

// Agent state (mock)
let agentState = {
  state: "ready",
  lastResponse: "All clear. You have a meeting at 2pm. Glucose is 112, stable.",
  lastQuery: "Brief me",
  activeAgent: "macklemore",
  teamStatus: { macklemore: "active", rosie: "active", winnie: "idle", lenny: "active" },
  pendingAlerts: 0,
  timestamp: Date.now(),
};

// Mock response generator
function mockAgentResponse(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("next") || lower.includes("schedule")) {
    const now = new Date();
    const h = now.getHours();
    if (h < 9) return "Next: Team Standup at 9:00am. Investor Call at 2:00pm.";
    if (h < 14) return "Next: Investor Call at 2:00pm. Block ends at 3:00pm.";
    return "No more events today. Tomorrow: 9am standup.";
  }
  if (lower.includes("glucose") || lower.includes("health")) {
    return `Glucose: ${112 + rand(-5, 5)} mg/dL, stable. HR: ${72 + rand(-3, 3)} bpm. SpO2: 98%. Steps: 4,821.`;
  }
  if (lower.includes("message") || lower.includes("read")) {
    return "2 unread messages. Macklemore: Deployment complete. Michael: Testing the glasses HUD.";
  }
  if (lower.includes("weather")) {
    return "72°F partly cloudy. Wind 8mph SW. UV index 4. Good conditions.";
  }
  if (lower.includes("brief") || lower.includes("status")) {
    return "All clear. Glucose 112, stable. Meeting at 2pm. No alerts. Markets: flat.";
  }
  return "I'm here. What do you need?";
}

// Mock voice transcriptions (cycling)
const mockTranscriptions = [
  "What's next on my schedule?",
  "Brief me on my health",
  "Read my messages",
  "What's the weather?",
  "Give me a status update",
];
let mockTranscriptionIdx = 0;

// POST /api/glasses/agent-query
app.post("/api/glasses/agent-query", (req, res) => {
  const { text, type } = req.body as { text: string; type: string };
  console.log(`[Agent] Query (${type}): ${text}`);
  const response = mockAgentResponse(text || "");
  agentState = {
    ...agentState,
    state: "ready",
    lastResponse: response,
    lastQuery: text || "",
    timestamp: Date.now(),
  };
  res.json({ ok: true, response });
});

// GET /api/glasses/agent-state
app.get("/api/glasses/agent-state", (_req, res) => {
  res.json({ ...agentState, timestamp: Date.now() });
});

// POST /api/glasses/agent-voice  — receive audio chunk
app.post("/api/glasses/agent-voice", (req, res) => {
  audioBuffer.push(req.body.audio);
  agentState = { ...agentState, state: "listening", timestamp: Date.now() };
  res.json({ ok: true });
});

// POST /api/glasses/agent-voice-end  — finalize voice capture
app.post("/api/glasses/agent-voice-end", (_req, res) => {
  const transcription = mockTranscriptions[mockTranscriptionIdx % mockTranscriptions.length];
  mockTranscriptionIdx++;
  const response = mockAgentResponse(transcription);
  audioBuffer = [];
  agentState = {
    ...agentState,
    state: "ready",
    lastResponse: response,
    lastQuery: transcription,
    timestamp: Date.now(),
  };
  console.log(`[Agent] Voice → "${transcription}" → "${response}"`);
  res.json({ ok: true, transcription, response });
});

// ─── Location ───
app.post("/api/glasses/location", (req, res) => {
  lastLocation = { ...req.body, receivedAt: Date.now() };
  console.log(`[Backend] Location update from ${req.body.user}`);
  res.json({ ok: true });
});

app.get("/api/glasses/location", (_req, res) => {
  res.json(lastLocation || { error: "No location data yet" });
});

// ─── Voice/STT ───
app.post("/api/glasses/voice", (req, res) => {
  const chunks = audioBuffer.length;
  audioBuffer = [];
  console.log(`[Backend] Processing ${chunks} audio chunks`);
  res.json({ ok: true, transcription: "[voice transcription placeholder]" });
});

// ─── CyberDeck: Combined Vitals (dynamic mock — varies each call) ───
// Realistic simulation with drift to make it feel live
let glucoseBase = 112;
let hrBase = 72;
let spo2Base = 98;
let stepsBase = 4200;

app.get("/api/glasses/vitals", (_req, res) => {
  // Simulate slow drift over time
  glucoseBase += randFloat(-2, 2);
  glucoseBase = Math.min(Math.max(glucoseBase, 70), 180);
  hrBase += rand(-3, 3);
  hrBase = Math.min(Math.max(hrBase, 55), 110);
  spo2Base += randFloat(-0.5, 0.3);
  spo2Base = Math.min(Math.max(spo2Base, 93), 100);
  stepsBase += rand(0, 15);

  const trends = [
    "Flat",
    "FortyFiveUp",
    "FortyFiveDown",
    "SingleUp",
    "SingleDown",
  ];
  const trend = trends[rand(0, trends.length - 1)];

  res.json({
    glucose: Math.round(glucoseBase),
    glucoseTrend: trend,
    heartRate: Math.round(hrBase),
    spo2: Math.round(spo2Base),
    steps: stepsBase,
    timestamp: Date.now(),
  });
});

// ─── CyberDeck: Nearby Device Scan (dynamic RSSI variation) ───
const devicePool = [
  { name: "Home-WiFi-5G", type: "wifi", rssiBase: -45 },
  { name: "iPhone-Michael", type: "ble", rssiBase: -35 },
  { name: "Apple Watch", type: "ble", rssiBase: -42 },
  { name: "Dexcom G7", type: "ble", rssiBase: -55 },
  { name: "MacMini-Office", type: "wifi", rssiBase: -62 },
  { name: "Neighbor-Guest", type: "wifi", rssiBase: -78 },
  { name: "Ring Doorbell", type: "wifi", rssiBase: -70 },
  { name: "R1 Ring", type: "ble", rssiBase: -30 },
];

app.get("/api/glasses/nearby-devices", (_req, res) => {
  const devices = devicePool.map((d) => ({
    name: d.name,
    type: d.type as "wifi" | "ble",
    rssi: d.rssiBase + rand(-5, 5),
  }));
  res.json(devices);
});

// ─── Spatial / Heading ───

// POST /api/glasses/heading — phone sends compass reading
app.post("/api/glasses/heading", (req, res) => {
  const { heading, accuracy } = req.body;
  if (typeof heading === "number") {
    latestHeading = heading;
    headingSetAt = Date.now();
    console.log(`[Backend] Heading update: ${heading}° (accuracy: ${accuracy})`);
  }
  res.json({ ok: true });
});

// Simple string hash → consistent 0-359 bearing per device name
function nameToBearing(name: string): number {
  let h = 5381;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) + h) ^ name.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h % 360;
}

// RSSI → distance estimate
function rssiToDistance(rssi: number, type: "wifi" | "ble"): number {
  const txPower = type === "ble" ? -59 : -30;
  const n = 2.5;
  const dist = Math.pow(10, (txPower - rssi) / (10 * n));
  return parseFloat(dist.toFixed(1));
}

// Slowly drifting mock heading (simulates user walking around)
function getMockHeading(): number {
  const elapsed = (Date.now() - serverStartTime) / 1000; // seconds
  // Drift at ~12°/s cycle (full rotation every 30s)
  return Math.round((elapsed * 12) % 360);
}

// GET /api/glasses/spatial-scan
app.get("/api/glasses/spatial-scan", (_req, res) => {
  // Use phone-provided heading if fresh (< 10s old), else drift
  const heading =
    latestHeading !== null && Date.now() - headingSetAt < 10000
      ? latestHeading
      : getMockHeading();

  const devices = devicePool.map((d) => ({
    name: d.name,
    type: d.type as "wifi" | "ble",
    rssi: d.rssiBase + rand(-5, 5),
    bearing: nameToBearing(d.name),
    distance: rssiToDistance(d.rssiBase + rand(-5, 5), d.type as "wifi" | "ble"),
  }));

  res.json({ heading, devices });
});

// GET /api/glasses/uwb-scan — future UWB stub
app.get("/api/glasses/uwb-scan", (_req, res) => {
  res.json({ supported: false, devices: [] });
});

// ─── Positional Awareness Routes ───
import positionalRouter from "./positional.js";
app.use("/api/glasses/positional", positionalRouter);

app.listen(PORT, () => {
  console.log(`[GlassesBackend] Listening on :${PORT}`);
  console.log(
    `[GlassesBackend] Endpoints: /api/health /messages /email /calendar /glucose /agent-message /location /vitals /nearby-devices /heading /spatial-scan /uwb-scan /positional/*`
  );
});
