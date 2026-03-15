import { waitForEvenAppBridge, type EvenAppBridge } from "@evenrealities/even_hub_sdk";
import {
  drawWeatherPanel,
  drawAirQualityPanel,
  drawPOIPanel,
  drawAircraftPanel,
  type WeatherData,
  type AirQuality,
  type POI,
  type Aircraft,
  type LocationInfo,
} from "./panels.js";

// ─── G2 Display Constants ───
const DISPLAY_W = 576;
const DISPLAY_H = 136; // per-eye usable height

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (window.location.hostname === "localhost" ? "http://localhost:3000" : "");

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

interface PositionalData {
  weather?: WeatherData;
  airQuality?: AirQuality;
  pois?: POI[];
  aircraft?: Aircraft[];
  location?: LocationInfo;
}

// Panel indices
const PANEL_VITALS = 0;
const PANEL_SCAN = 1;
const PANEL_ALERTS = 2;
const PANEL_WEATHER = 3;
const PANEL_AIR = 4;
const PANEL_POI = 5;
const PANEL_AIRCRAFT = 6;
const TOTAL_PANELS = 7;

const PANEL_LABELS = ["VITALS", "SCAN", "ALERTS", "WEATHER", "AIR", "POI", "AIRCRAFT"];

interface HUDState {
  vitals: Vitals;
  devices: NearbyDevice[];
  alerts: string[];
  time: string;
  battery: number;
  activePanel: number;
  positional: PositionalData;
  webMode: boolean; // true when Even Hub bridge is not available
}

let bridge: EvenAppBridge | null = null;
let state: HUDState = {
  vitals: {
    glucose: 0,
    glucoseTrend: "Flat",
    heartRate: 0,
    spo2: 0,
    steps: 0,
    timestamp: 0,
  },
  devices: [],
  alerts: [],
  time: "",
  battery: 100,
  activePanel: PANEL_VITALS,
  positional: {},
  webMode: true,
};

// ─── Canvas Setup ───
const canvas = document.createElement("canvas");
canvas.width = DISPLAY_W;
canvas.height = DISPLAY_H;
const ctx = canvas.getContext("2d")!;

// ─── Drawing ───

function drawHUD() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;

  // Top Bar: Time + Battery
  ctx.font = "bold 14px monospace";
  ctx.fillText(state.time, 8, 16);
  ctx.font = "11px monospace";
  ctx.fillText(`BAT:${state.battery}%`, DISPLAY_W - 72, 16);

  // Web preview mode indicator
  if (state.webMode) {
    ctx.font = "9px monospace";
    ctx.fillStyle = "#aaa";
    ctx.fillText("WEB PREVIEW", DISPLAY_W / 2 - 32, 14);
    ctx.fillStyle = "#fff";
  }

  // Corner brackets
  drawBracket(2, 2, 20, 20, "tl");
  drawBracket(DISPLAY_W - 22, 2, 20, 20, "tr");
  drawBracket(2, DISPLAY_H - 22, 20, 20, "bl");
  drawBracket(DISPLAY_W - 22, DISPLAY_H - 22, 20, 20, "br");

  // Horizontal rule under top bar
  ctx.beginPath();
  ctx.moveTo(8, 22);
  ctx.lineTo(DISPLAY_W - 8, 22);
  ctx.stroke();

  // Main Content
  switch (state.activePanel) {
    case PANEL_VITALS:
      drawVitalsPanel();
      break;
    case PANEL_SCAN:
      drawSurroundingsPanel();
      break;
    case PANEL_ALERTS:
      drawAlertsPanel();
      break;
    case PANEL_WEATHER:
      if (state.positional.weather) {
        drawWeatherPanel(ctx, state.positional.weather, 22);
      } else {
        drawPlaceholder("WEATHER", "No weather data — enable location");
      }
      break;
    case PANEL_AIR:
      if (state.positional.airQuality) {
        drawAirQualityPanel(ctx, state.positional.airQuality, 12, 26);
      } else {
        drawPlaceholder("AIR QUALITY", "No air quality data — enable location");
      }
      break;
    case PANEL_POI:
      drawPOIPanel(ctx, state.positional.pois || [], state.positional.location || { address: "Unknown" }, 22);
      break;
    case PANEL_AIRCRAFT:
      drawAircraftPanel(ctx, state.positional.aircraft || [], DISPLAY_W, 22);
      break;
  }

  // Bottom Nav — scrollable dot indicator
  drawNavBar();
}

function drawNavBar() {
  // Show a compact nav with prev/current/next labels + position dots
  const y = DISPLAY_H - 14;

  // Left arrow indicator
  if (state.activePanel > 0) {
    ctx.font = "10px monospace";
    ctx.fillText("◀", 8, y + 9);
  }

  // Current panel label centered
  const label = PANEL_LABELS[state.activePanel];
  ctx.font = "bold 11px monospace";
  const lw = ctx.measureText(label).width;
  ctx.fillRect(DISPLAY_W / 2 - lw / 2 - 4, y, lw + 8, 13);
  ctx.fillStyle = "#000";
  ctx.fillText(label, DISPLAY_W / 2 - lw / 2, y + 10);
  ctx.fillStyle = "#fff";

  // Right arrow indicator
  if (state.activePanel < TOTAL_PANELS - 1) {
    ctx.font = "10px monospace";
    ctx.fillText("▶", DISPLAY_W - 18, y + 9);
  }

  // Position dots
  const dotSpacing = 8;
  const totalDotW = TOTAL_PANELS * dotSpacing;
  const dotStartX = DISPLAY_W / 2 - totalDotW / 2;
  for (let i = 0; i < TOTAL_PANELS; i++) {
    const dx = dotStartX + i * dotSpacing + dotSpacing / 2;
    const dy = y - 6;
    if (i === state.activePanel) {
      ctx.fillRect(dx - 2, dy - 2, 4, 4); // filled square for active
    } else {
      ctx.strokeRect(dx - 1, dy - 1, 2, 2); // hollow for inactive
    }
  }
}

function drawPlaceholder(title: string, msg: string) {
  ctx.font = "bold 12px monospace";
  ctx.fillText(title, 12, 40);
  ctx.font = "10px monospace";
  ctx.fillStyle = "#888";
  ctx.fillText(msg, 12, 60);
  ctx.fillStyle = "#fff";
}

function drawVitalsPanel() {
  const y0 = 28;
  const colW = DISPLAY_W / 4;

  const trendArrows: Record<string, string> = {
    DoubleUp: "⬆⬆",
    SingleUp: "⬆",
    FortyFiveUp: "↗",
    Flat: "→",
    FortyFiveDown: "↘",
    SingleDown: "⬇",
    DoubleDown: "⬇⬇",
  };
  const arrow = trendArrows[state.vitals.glucoseTrend] || "?";
  const gAlert =
    state.vitals.glucose < 70 ? " LOW!" : state.vitals.glucose > 180 ? " HIGH!" : "";

  // Glucose box
  ctx.strokeRect(8, y0, colW * 2 - 16, 70);
  ctx.font = "10px monospace";
  ctx.fillText("GLUCOSE mg/dL", 14, y0 + 14);
  ctx.font = "bold 36px monospace";
  ctx.fillText(`${state.vitals.glucose}`, 20, y0 + 52);
  ctx.font = "bold 20px monospace";
  ctx.fillText(`${arrow}${gAlert}`, colW - 10, y0 + 52);

  // Mini glucose bar
  const barW =
    Math.min(Math.max((state.vitals.glucose - 40) / 260, 0), 1) * (colW * 2 - 32);
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

  // Steps box
  const stX = colW * 3;
  ctx.strokeRect(stX, y0, colW - 12, 70);
  ctx.font = "10px monospace";
  ctx.fillText("STEPS", stX + 6, y0 + 14);
  ctx.font = "bold 18px monospace";
  ctx.fillText(`${state.vitals.steps.toLocaleString()}`, stX + 6, y0 + 40);
  const stepPct = Math.min(state.vitals.steps / 10000, 1);
  ctx.strokeRect(stX + 6, y0 + 50, colW - 24, 8);
  ctx.fillRect(stX + 6, y0 + 50, (colW - 24) * stepPct, 8);
}

function drawSurroundingsPanel() {
  const y0 = 28;
  ctx.font = "bold 12px monospace";
  ctx.fillText(`NEARBY: ${state.devices.length} devices`, 12, y0 + 12);

  const maxShow = 6;
  state.devices.slice(0, maxShow).forEach((d, i) => {
    const y = y0 + 24 + i * 14;
    const bars =
      d.rssi > -50 ? "████" : d.rssi > -65 ? "███░" : d.rssi > -75 ? "██░░" : "█░░░";
    const icon = d.type === "wifi" ? "W" : "B";
    ctx.font = "11px monospace";
    ctx.fillText(`[${icon}] ${bars} ${d.name.slice(0, 28)}`, 12, y);
  });

  // Radar decoration
  const rcx = DISPLAY_W - 60;
  const rcy = y0 + 50;
  ctx.beginPath();
  ctx.arc(rcx, rcy, 35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rcx, rcy, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rcx - 35, rcy);
  ctx.lineTo(rcx + 35, rcy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rcx, rcy - 35);
  ctx.lineTo(rcx, rcy + 35);
  ctx.stroke();

  state.devices.slice(0, 8).forEach((d, i) => {
    const dist = Math.max(5, 35 * (1 - (d.rssi + 90) / 50));
    const angle = (i / 8) * Math.PI * 2;
    const dx = rcx + Math.cos(angle) * dist;
    const dy = rcy + Math.sin(angle) * dist;
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

function drawBracket(
  x: number,
  y: number,
  w: number,
  h: number,
  corner: string
) {
  ctx.beginPath();
  if (corner === "tl") {
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y);
    ctx.lineTo(x + w, y);
  }
  if (corner === "tr") {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
  }
  if (corner === "bl") {
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + w, y + h);
  }
  if (corner === "br") {
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
  }
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
      const brightness =
        pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
      if (brightness > 127) {
        const byteIdx = y * byteWidth + Math.floor(x / 8);
        raw[byteIdx] |= 0x80 >> (x % 8);
      }
    }
  }
  return raw;
}

// ─── Push rendered HUD to glasses (only when bridge is connected) ───
async function pushToGlasses() {
  drawHUD();
  renderWebPreview();

  if (!bridge) return;

  const rawData = canvasTo1Bit();
  const b64 = btoa(String.fromCharCode(...rawData));

  try {
    bridge.updateImageRawData(
      JSON.stringify({
        name: "hud",
        width: DISPLAY_W,
        height: DISPLAY_H,
        data: b64,
      })
    );
  } catch (e) {
    console.error("[CyberDeck] Image push failed:", e);
    const textSummary = `BG:${state.vitals.glucose}${state.vitals.glucoseTrend === "Flat" ? "→" : "↕"} HR:${state.vitals.heartRate} O2:${state.vitals.spo2}%\nDevices:${state.devices.length} nearby\n${state.alerts[0] || "No alerts"}`;
    bridge.rebuildPageContainer(
      JSON.stringify([
        {
          type: "text",
          name: "hud",
          text: textSummary,
          isEventCapture: 1,
        },
      ])
    );
  }
}

// ─── Web Preview: scale canvas to fill viewport ───
let scaledCanvas: HTMLCanvasElement | null = null;
let scaledCtx: CanvasRenderingContext2D | null = null;

function renderWebPreview() {
  if (!scaledCanvas || !scaledCtx) return;

  const scaleX = scaledCanvas.width / DISPLAY_W;
  const scaleY = scaledCanvas.height / DISPLAY_H;

  scaledCtx.clearRect(0, 0, scaledCanvas.width, scaledCanvas.height);
  scaledCtx.imageSmoothingEnabled = false;
  scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

  // Draw scanlines for CRT feel
  scaledCtx.fillStyle = "rgba(0,0,0,0.08)";
  for (let y = 0; y < scaledCanvas.height; y += 4 * scaleY) {
    scaledCtx.fillRect(0, y, scaledCanvas.width, 2 * scaleY);
  }
}

// ─── Fetch all data from backend ───
async function fetchAll() {
  try {
    const [vitalsRes, devicesRes] = await Promise.all([
      fetch(`${API_BASE}/api/glasses/vitals`).catch(() => null),
      fetch(`${API_BASE}/api/glasses/nearby-devices`).catch(() => null),
    ]);

    if (vitalsRes?.ok) {
      const v = await vitalsRes.json();
      state.vitals = v;
      state.alerts = [];
      if (v.glucose < 70) state.alerts.push(`LOW GLUCOSE: ${v.glucose} mg/dL`);
      if (v.glucose > 180) state.alerts.push(`HIGH GLUCOSE: ${v.glucose} mg/dL`);
      if (v.heartRate > 120) state.alerts.push(`HIGH HR: ${v.heartRate} bpm`);
      if (v.spo2 < 94) state.alerts.push(`LOW SpO2: ${v.spo2}%`);
    }
    if (devicesRes?.ok) {
      state.devices = await devicesRes.json();
    }
  } catch (e) {
    console.error("[CyberDeck] Fetch failed:", e);
  }

  state.time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  state.battery = bridge ? 85 : 100; // TODO: get from bridge.getDeviceInfo()

  await pushToGlasses();
}

// ─── Input Handling (R1 Ring via bridge) ───
function handleInput(event: any) {
  const type = event?.type || event?.eventType;
  switch (type) {
    case "SCROLL_BOTTOM":
      navigateNext();
      break;
    case "SCROLL_TOP":
      navigatePrev();
      break;
    case "CLICK":
      fetchAll();
      break;
  }
}

function navigateNext() {
  state.activePanel = Math.min(state.activePanel + 1, TOTAL_PANELS - 1);
  pushToGlasses();
}

function navigatePrev() {
  state.activePanel = Math.max(state.activePanel - 1, 0);
  pushToGlasses();
}

// ─── Web Preview Interactivity: keyboard + touch ───
function setupWebInteractivity() {
  // Keyboard: left/right arrow keys to navigate panels
  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        navigateNext();
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        navigatePrev();
        break;
      case " ":
      case "Enter":
        e.preventDefault();
        fetchAll(); // click = refresh
        break;
    }
  });

  // Click/tap on scaled canvas to refresh
  if (scaledCanvas) {
    scaledCanvas.addEventListener("click", () => fetchAll());
    scaledCanvas.style.cursor = "pointer";
  }

  // Touch swipe: left = next, right = prev
  let touchStartX = 0;
  document.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
    },
    { passive: true }
  );
  document.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) {
        if (dx < 0) navigateNext();
        else navigatePrev();
      } else {
        fetchAll(); // tap = refresh
      }
    },
    { passive: true }
  );
}

// ─── Setup Web Preview DOM ───
function setupWebPreviewDOM() {
  document.body.style.cssText = `
    margin: 0; padding: 0; background: #111; 
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 100vh; font-family: monospace; color: #fff; overflow: hidden;
  `;

  const appEl = document.getElementById("app")!;
  appEl.style.cssText = "display: flex; flex-direction: column; align-items: center; width: 100%;";

  // Title bar
  const titleBar = document.createElement("div");
  titleBar.style.cssText =
    "font-size: 11px; color: #555; margin-bottom: 8px; letter-spacing: 2px; text-transform: uppercase;";
  titleBar.textContent = "Even G2 CyberDeck HUD — Web Preview";
  appEl.appendChild(titleBar);

  // Wrapper for the scaled canvas
  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "border: 1px solid #333; box-shadow: 0 0 30px rgba(0,255,255,0.1); position: relative;";
  appEl.appendChild(wrapper);

  // Compute scale to fit viewport (at least 2x, up to viewport width)
  const maxW = Math.min(window.innerWidth - 32, DISPLAY_W * 4);
  const scale = Math.max(2, Math.floor(maxW / DISPLAY_W));
  const scaledW = DISPLAY_W * scale;
  const scaledH = DISPLAY_H * scale;

  scaledCanvas = document.createElement("canvas");
  scaledCanvas.width = scaledW;
  scaledCanvas.height = scaledH;
  scaledCanvas.style.cssText = `display: block; width: ${scaledW}px; height: ${scaledH}px;`;
  scaledCtx = scaledCanvas.getContext("2d")!;
  wrapper.appendChild(scaledCanvas);

  // Help bar
  const helpBar = document.createElement("div");
  helpBar.style.cssText =
    "font-size: 10px; color: #444; margin-top: 10px; letter-spacing: 1px;";
  helpBar.textContent = "← → Arrow keys to switch panels  |  Space/Click to refresh  |  Swipe on mobile";
  appEl.appendChild(helpBar);

  // Bridge status indicator
  const statusEl = document.createElement("div");
  statusEl.id = "bridge-status";
  statusEl.style.cssText =
    "font-size: 10px; margin-top: 4px; color: #f80;";
  statusEl.textContent = "⟳ Connecting to Even Hub bridge...";
  appEl.appendChild(statusEl);

  setupWebInteractivity();
}

function updateBridgeStatus(connected: boolean) {
  const el = document.getElementById("bridge-status");
  if (!el) return;
  if (connected) {
    el.style.color = "#0f0";
    el.textContent = "● Even Hub Bridge Connected — Glasses Active";
  } else {
    el.style.color = "#f80";
    el.textContent = "○ Web Preview Mode — Bridge not detected (glasses not connected)";
  }
}

// ─── Init ───
async function init() {
  // Mount web preview DOM immediately (don't wait for bridge)
  setupWebPreviewDOM();

  // Draw immediately with placeholder data so user sees something right away
  state.time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  drawHUD();
  renderWebPreview();

  // Attempt bridge connection with 3-second timeout — non-blocking
  const bridgePromise = new Promise<EvenAppBridge | null>((resolve) => {
    const timer = setTimeout(() => {
      console.warn("[CyberDeck] Bridge timeout — running in web preview mode");
      resolve(null);
    }, 3000);

    waitForEvenAppBridge()
      .then((b) => {
        clearTimeout(timer);
        resolve(b);
      })
      .catch((err) => {
        clearTimeout(timer);
        console.warn("[CyberDeck] Bridge unavailable:", err);
        resolve(null);
      });
  });

  // Kick off data fetch immediately (doesn't need bridge)
  const fetchPromise = fetchAll();

  // Wait for both
  const [bridgeResult] = await Promise.all([bridgePromise, fetchPromise]);

  if (bridgeResult) {
    bridge = bridgeResult;
    state.webMode = false;
    console.log("[CyberDeck] Bridge initialized — glasses active");
    bridge.onEvenHubEvent((event: any) => handleInput(event));
    updateBridgeStatus(true);
  } else {
    state.webMode = true;
    updateBridgeStatus(false);
  }

  // Refresh loop: every 5s
  setInterval(fetchAll, 5000);
}

init().catch(console.error);
