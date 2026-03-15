import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const PORT = process.env.PORT || 3000;

// ─── State ───
let lastLocation: any = null;
let audioBuffer: any[] = [];

// ─── Telegram Messages ───
// TODO: Wire to OpenClaw Telegram bot via Bot API or gateway webhook
app.get("/api/glasses/messages", (_req, res) => {
  res.json([
    { id: 1, chat: "SmartGlasses", sender: "Michael", text: "Testing the glasses HUD", timestamp: Date.now() - 60000 },
    { id: 2, chat: "Direct", sender: "Macklemore", text: "Deployment complete", timestamp: Date.now() },
  ]);
});

app.post("/api/glasses/send", (req, res) => {
  const { chat, text, type } = req.body; // type: "telegram" | "imessage" | "email"
  console.log(`[Backend] Send ${type || "telegram"} to ${chat}: ${text}`);
  // TODO: Route to appropriate service (Telegram Bot API, imsg CLI, gog/himalaya)
  res.json({ ok: true });
});

// ─── Email ───
// TODO: Wire to gog (Gmail) or himalaya (IMAP)
app.get("/api/glasses/email", (_req, res) => {
  res.json([
    { id: "1", from: "investor@example.com", subject: "RE: Series A", snippet: "Thanks for the update...", timestamp: Date.now() - 3600000 },
    { id: "2", from: "team@protelynx.ai", subject: "Build passing", snippet: "All CI checks green", timestamp: Date.now() },
  ]);
});

// ─── Calendar ───
// TODO: Wire to gog calendar CLI
app.get("/api/glasses/calendar", (_req, res) => {
  const today = new Date();
  res.json([
    { title: "Team Standup", start: new Date(today.setHours(9, 0)).toISOString(), end: new Date(today.setHours(9, 30)).toISOString() },
    { title: "Investor Call", start: new Date(today.setHours(14, 0)).toISOString(), end: new Date(today.setHours(15, 0)).toISOString(), location: "Zoom" },
  ]);
});

// ─── Dexcom CGM ───
// TODO: Wire to Dexcom Share API (requires sessionId auth)
// Dexcom Share endpoint: https://share2.dexcom.com/ShareWebServices/Services
app.get("/api/glasses/glucose", (_req, res) => {
  res.json({
    latest: { value: 112, trend: "Flat", timestamp: Date.now() - 120000 },
    history: [
      { value: 105, trend: "FortyFiveUp", timestamp: Date.now() - 1500000 },
      { value: 108, trend: "Flat", timestamp: Date.now() - 1200000 },
      { value: 115, trend: "FortyFiveUp", timestamp: Date.now() - 900000 },
      { value: 118, trend: "Flat", timestamp: Date.now() - 600000 },
      { value: 114, trend: "FortyFiveDown", timestamp: Date.now() - 300000 },
      { value: 112, trend: "Flat", timestamp: Date.now() - 120000 },
    ],
  });
});

// ─── Agent Communication ───
app.post("/api/glasses/agent-message", (req, res) => {
  const { type, user } = req.body;
  console.log(`[Backend] Agent message from ${user}, type: ${type}`);
  // TODO: Forward voice transcription to OpenClaw gateway, return agent response
  res.json({ response: "Macklemore: All systems green. Rosie: Markets flat. Lenny: No alerts." });
});

app.post("/api/glasses/audio-chunk", (req, res) => {
  audioBuffer.push(req.body.audio);
  res.json({ ok: true });
});

app.get("/api/glasses/agent-status", (_req, res) => {
  // TODO: Query OpenClaw sessions_list for real agent status
  res.json({ status: "Mack:✅ Rosie:✅ Winnie:✅ Lenny:✅" });
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
  // TODO: Send accumulated audio to Whisper API for transcription
  const chunks = audioBuffer.length;
  audioBuffer = [];
  console.log(`[Backend] Processing ${chunks} audio chunks`);
  res.json({ ok: true, transcription: "[voice transcription placeholder]" });
});

app.listen(PORT, () => {
  console.log(`[GlassesBackend] Listening on :${PORT}`);
  console.log(`[GlassesBackend] Endpoints: /messages /email /calendar /glucose /agent-message /location`);
});

// ─── CyberDeck: Combined Vitals ───
// TODO: Wire to Dexcom Share API + Apple Health (via phone) + wearable APIs
app.get("/api/glasses/vitals", (_req, res) => {
  res.json({
    glucose: 112 + Math.floor(Math.random() * 20 - 10),
    glucoseTrend: ["Flat", "FortyFiveUp", "FortyFiveDown"][Math.floor(Math.random() * 3)],
    heartRate: 72 + Math.floor(Math.random() * 10 - 5),
    spo2: 97 + Math.floor(Math.random() * 3 - 1),
    steps: 4200 + Math.floor(Math.random() * 500),
    timestamp: Date.now(),
  });
});

// ─── CyberDeck: Nearby Device Scan ───
// TODO: Wire to phone's WiFi/BLE scan results via Even App bridge
app.get("/api/glasses/nearby-devices", (_req, res) => {
  // Mock data — in production the phone scans and reports
  res.json([
    { name: "Home-WiFi-5G", type: "wifi", rssi: -45 },
    { name: "iPhone-Michael", type: "ble", rssi: -35 },
    { name: "Apple Watch", type: "ble", rssi: -42 },
    { name: "Dexcom G7", type: "ble", rssi: -55 },
    { name: "MacMini-Office", type: "wifi", rssi: -62 },
    { name: "Neighbor-Guest", type: "wifi", rssi: -78 },
    { name: "Ring Doorbell", type: "wifi", rssi: -70 },
    { name: "R1 Ring", type: "ble", rssi: -30 },
  ]);
});

// ─── Positional Awareness Routes ───
import positionalRouter from "./positional.js";
app.use("/api/glasses/positional", positionalRouter);
