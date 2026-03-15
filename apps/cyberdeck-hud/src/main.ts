import { waitForEvenAppBridge, type EvenAppBridge } from "@evenrealities/even_hub_sdk";

// ─── G2 Display Constants ───
const DISPLAY_W = 576;
const DISPLAY_H = 136; // per-eye usable height (half of 288 for non-obstructive)

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

interface Vitals {
  glucose: number;
  glucoseTrend: string;
  heartRate: number;
  spo2: number;
  steps: number;
  timestamp: number;
}

interface NearbyDevice {
  name: string;
  type: "wifi" | "ble";
  rssi: number;
}

interface HUDState {
  vitals: Vitals;
  devices: NearbyDevice[];
  alerts: string[];
  time: string;
  battery: number;
  activePanel: number; // 0=vitals, 1=surroundings, 2=alerts
}

let bridge: EvenAppBridge;
let state: HUDState = {
  vitals: { glucose: 0, glucoseTrend: "Flat", heartRate: 0, spo2: 0, steps: 0, timestamp: 0 },
  devices: [],
  alerts: [],
  time: "",
  battery: 100,
  activePanel: 0,
};

// ─── Canvas Rendering (runs in WebView, output sent to glasses as 1-bit image) ───
const canvas = document.createElement("canvas");
canvas.width = DISPLAY_W;
canvas.height = DISPLAY_H;
const ctx = canvas.getContext("2d")!;

function drawHUD() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;

  // ─── Top Bar: Time + Battery + Status ───
  ctx.font = "bold 14px monospace";
  ctx.fillText(state.time, 8, 16);
  ctx.font = "11px monospace";
  ctx.fillText(`BAT:${state.battery}%`, DISPLAY_W - 72, 16);

  // Corner brackets (futuristic frame)
  drawBracket(2, 2, 20, 20, "tl");
  drawBracket(DISPLAY_W - 22, 2, 20, 20, "tr");
  drawBracket(2, DISPLAY_H - 22, 20, 20, "bl");
  drawBracket(DISPLAY_W - 22, DISPLAY_H - 22, 20, 20, "br");

  // Thin horizontal rule under top bar
  ctx.beginPath();
  ctx.moveTo(8, 22);
  ctx.lineTo(DISPLAY_W - 8, 22);
  ctx.stroke();

  // ─── Main Content Area (based on activePanel) ───
  if (state.activePanel === 0) drawVitalsPanel();
  else if (state.activePanel === 1) drawSurroundingsPanel();
  else drawAlertsPanel();

  // ─── Bottom Nav Indicator ───
  const labels = ["VITALS", "SCAN", "ALERTS"];
  const panelW = DISPLAY_W / 3;
  labels.forEach((label, i) => {
    const x = panelW * i;
    ctx.font = i === state.activePanel ? "bold 11px monospace" : "11px monospace";
    if (i === state.activePanel) {
      ctx.fillRect(x + 4, DISPLAY_H - 16, panelW - 8, 14);
      ctx.fillStyle = "#000";
      ctx.fillText(label, x + panelW / 2 - ctx.measureText(label).width / 2, DISPLAY_H - 5);
      ctx.fillStyle = "#fff";
    } else {
      ctx.fillText(label, x + panelW / 2 - ctx.measureText(label).width / 2, DISPLAY_H - 5);
    }
  });
}

function drawVitalsPanel() {
  const y0 = 30;
  const colW = DISPLAY_W / 4;

  // Glucose — large center display
  const trendArrows: Record<string, string> = {
    DoubleUp: "⬆⬆", SingleUp: "⬆", FortyFiveUp: "↗",
    Flat: "→", FortyFiveDown: "↘", SingleDown: "⬇", DoubleDown: "⬇⬇",
  };
  const arrow = trendArrows[state.vitals.glucoseTrend] || "?";
  const gAlert = state.vitals.glucose < 70 ? " LOW!" : state.vitals.glucose > 180 ? " HIGH!" : "";

  // Glucose box
  ctx.strokeRect(8, y0, colW * 2 - 16, 70);
  ctx.font = "10px monospace";
  ctx.fillText("GLUCOSE mg/dL", 14, y0 + 14);
  ctx.font = "bold 36px monospace";
  ctx.fillText(`${state.vitals.glucose}`, 20, y0 + 52);
  ctx.font = "bold 20px monospace";
  ctx.fillText(`${arrow}${gAlert}`, colW - 10, y0 + 52);

  // Mini glucose graph placeholder (horizontal bar)
  const barW = Math.min(Math.max((state.vitals.glucose - 40) / 260, 0), 1) * (colW * 2 - 32);
  ctx.fillRect(14, y0 + 60, barW, 4);

  // Heart Rate box
  const hrX = colW * 2;
  ctx.strokeRect(hrX, y0, colW - 8, 32);
  ctx.font = "10px monospace";
  ctx.fillText("HR bpm", hrX + 6, y0 + 12);
  ctx.font = "bold 18px monospace";
  ctx.fillText(`${state.vitals.heartRate}`, hrX + 6, y0 + 28);

  // SpO2 box
  ctx.strokeRect(hrX, y0 + 36, colW - 8, 32);
  ctx.font = "10px monospace";
  ctx.fillText("SpO2 %", hrX + 6, y0 + 48);
  ctx.font = "bold 18px monospace";
  ctx.fillText(`${state.vitals.spo2}`, hrX + 6, y0 + 64);

  // Steps
  const stX = colW * 3;
  ctx.strokeRect(stX, y0, colW - 12, 70);
  ctx.font = "10px monospace";
  ctx.fillText("STEPS", stX + 6, y0 + 14);
  ctx.font = "bold 18px monospace";
  ctx.fillText(`${state.vitals.steps.toLocaleString()}`, stX + 6, y0 + 40);

  // Step progress bar (goal: 10000)
  const stepPct = Math.min(state.vitals.steps / 10000, 1);
  ctx.strokeRect(stX + 6, y0 + 50, colW - 24, 8);
  ctx.fillRect(stX + 6, y0 + 50, (colW - 24) * stepPct, 8);
}

function drawSurroundingsPanel() {
  const y0 = 28;
  ctx.font = "bold 12px monospace";
  ctx.fillText(`NEARBY: ${state.devices.length} devices`, 12, y0 + 12);

  // Signal strength visualization
  const maxShow = 6;
  state.devices.slice(0, maxShow).forEach((d, i) => {
    const y = y0 + 24 + i * 14;
    const bars = d.rssi > -50 ? "████" : d.rssi > -65 ? "███░" : d.rssi > -75 ? "██░░" : "█░░░";
    const icon = d.type === "wifi" ? "W" : "B";
    ctx.font = "11px monospace";
    ctx.fillText(`[${icon}] ${bars} ${d.name.slice(0, 28)}`, 12, y);
  });

  // Radar-style circle (decorative but cool)
  const cx = DISPLAY_W - 60;
  const cy = y0 + 50;
  ctx.beginPath(); ctx.arc(cx, cy, 35, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 35, cy); ctx.lineTo(cx + 35, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 35); ctx.lineTo(cx, cy + 35); ctx.stroke();

  // Plot dots for devices based on signal strength
  state.devices.slice(0, 8).forEach((d, i) => {
    const dist = Math.max(5, 35 * (1 - (d.rssi + 90) / 50));
    const angle = (i / 8) * Math.PI * 2;
    const dx = cx + Math.cos(angle) * dist;
    const dy = cy + Math.sin(angle) * dist;
    ctx.fillRect(dx - 2, dy - 2, 4, 4);
  });
}

function drawAlertsPanel() {
  const y0 = 28;
  ctx.font = "bold 12px monospace";
  ctx.fillText("ALERTS", 12, y0 + 12);

  if (state.alerts.length === 0) {
    ctx.font = "11px monospace";
    ctx.fillText("No active alerts", 12, y0 + 32);
    ctx.fillText("All systems nominal ✓", 12, y0 + 48);
  } else {
    state.alerts.slice(0, 5).forEach((alert, i) => {
      ctx.font = "11px monospace";
      ctx.fillText(`⚠ ${alert.slice(0, 50)}`, 12, y0 + 24 + i * 14);
    });
  }
}

function drawBracket(x: number, y: number, w: number, h: number, corner: string) {
  ctx.beginPath();
  if (corner === "tl") { ctx.moveTo(x, y + h); ctx.lineTo(x, y); ctx.lineTo(x + w, y); }
  if (corner === "tr") { ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); }
  if (corner === "bl") { ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); }
  if (corner === "br") { ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); }
  ctx.stroke();
}

// ─── Convert canvas to 1-bit raw data for G2 display ───
function canvasTo1Bit(): Uint8Array {
  const imageData = ctx.getImageData(0, 0, DISPLAY_W, DISPLAY_H);
  const pixels = imageData.data;
  const byteWidth = Math.ceil(DISPLAY_W / 8);
  const raw = new Uint8Array(byteWidth * DISPLAY_H);

  for (let y = 0; y < DISPLAY_H; y++) {
    for (let x = 0; x < DISPLAY_W; x++) {
      const idx = (y * DISPLAY_W + x) * 4;
      const brightness = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
      if (brightness > 127) {
        const byteIdx = y * byteWidth + Math.floor(x / 8);
        raw[byteIdx] |= 0x80 >> (x % 8);
      }
    }
  }
  return raw;
}

// ─── Push rendered HUD to glasses ───
async function pushToGlasses() {
  if (!bridge) return;
  drawHUD();
  const rawData = canvasTo1Bit();

  // Convert to base64 for the SDK image call
  const b64 = btoa(String.fromCharCode(...rawData));

  try {
    bridge.updateImageRawData(JSON.stringify({
      name: "hud",
      width: DISPLAY_W,
      height: DISPLAY_H,
      data: b64,
    }));
  } catch (e) {
    console.error("[CyberDeck] Image push failed:", e);
    // Fallback: use text container
    const textSummary = `BG:${state.vitals.glucose}${state.vitals.glucoseTrend === "Flat" ? "→" : "↕"} HR:${state.vitals.heartRate} O2:${state.vitals.spo2}%\nDevices:${state.devices.length} nearby\n${state.alerts[0] || "No alerts"}`;
    bridge.rebuildPageContainer(JSON.stringify([{ type: "text", name: "hud", text: textSummary, isEventCapture: 1 }]));
  }
}

// ─── Fetch all data from backend ───
async function fetchAll() {
  try {
    const [vitalsRes, devicesRes] = await Promise.all([
      fetch(`${API_BASE}/api/glasses/vitals`),
      fetch(`${API_BASE}/api/glasses/nearby-devices`),
    ]);
    if (vitalsRes.ok) {
      const v = await vitalsRes.json();
      state.vitals = v;
      // Generate alerts from vitals
      state.alerts = [];
      if (v.glucose < 70) state.alerts.push(`LOW GLUCOSE: ${v.glucose} mg/dL`);
      if (v.glucose > 180) state.alerts.push(`HIGH GLUCOSE: ${v.glucose} mg/dL`);
      if (v.heartRate > 120) state.alerts.push(`HIGH HR: ${v.heartRate} bpm`);
      if (v.spo2 < 94) state.alerts.push(`LOW SpO2: ${v.spo2}%`);
    }
    if (devicesRes.ok) state.devices = await devicesRes.json();
  } catch (e) {
    console.error("[CyberDeck] Fetch failed:", e);
  }

  state.time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  state.battery = 85; // TODO: get from bridge.getDeviceInfo()

  await pushToGlasses();
}

// ─── Input Handling (R1 Ring) ───
function handleInput(event: any) {
  const type = event?.type || event?.eventType;
  switch (type) {
    case "SCROLL_BOTTOM":
      state.activePanel = Math.min(state.activePanel + 1, 2);
      pushToGlasses();
      break;
    case "SCROLL_TOP":
      state.activePanel = Math.max(state.activePanel - 1, 0);
      pushToGlasses();
      break;
    case "CLICK":
      fetchAll(); // manual refresh
      break;
  }
}

// ─── Init ───
async function init() {
  bridge = await waitForEvenAppBridge();
  console.log("[CyberDeck] Bridge initialized");

  bridge.onEvenHubEvent((event: any) => handleInput(event));

  // Also render in the WebView for debugging
  document.getElementById("app")!.appendChild(canvas);
  canvas.style.border = "1px solid #333";
  canvas.style.background = "#000";

  await fetchAll();
  setInterval(fetchAll, 5000); // refresh every 5s for real-time feel
}

init().catch(console.error);
