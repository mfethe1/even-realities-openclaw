import { waitForEvenAppBridge, type EvenAppBridge } from "@evenrealities/even_hub_sdk";

interface GlucoseReading {
  value: number;       // mg/dL
  trend: string;       // "Flat", "FortyFiveUp", "SingleUp", "DoubleUp", "FortyFiveDown", "SingleDown", "DoubleDown"
  timestamp: number;
}

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const POLL_INTERVAL = 60_000; // Dexcom updates every 5 min, poll every 60s

const TREND_ARROWS: Record<string, string> = {
  DoubleUp: "⬆⬆", SingleUp: "⬆", FortyFiveUp: "↗",
  Flat: "→",
  FortyFiveDown: "↘", SingleDown: "⬇", DoubleDown: "⬇⬇",
};

let bridge: EvenAppBridge;
let latestReading: GlucoseReading | null = null;
let history: GlucoseReading[] = [];

async function init() {
  bridge = await waitForEvenAppBridge();

  bridge.onEvenHubEvent((event: any) => {
    if (event?.type === "CLICK") fetchAndRender(); // manual refresh on tap
  });

  await fetchAndRender();
  setInterval(fetchAndRender, POLL_INTERVAL);
}

async function fetchAndRender() {
  try {
    const res = await fetch(`${API_BASE}/api/glasses/glucose`);
    if (res.ok) {
      const data = await res.json();
      latestReading = data.latest;
      history = data.history || [];
    }
  } catch (e) {
    console.error("[HealthHUD] Fetch failed:", e);
  }
  render();
}

function render() {
  if (!bridge) return;

  let glucoseText: string;
  if (!latestReading) {
    glucoseText = "Dexcom\n─────────\nNo data yet\nTap to refresh";
  } else {
    const arrow = TREND_ARROWS[latestReading.trend] || "?";
    const age = Math.round((Date.now() - latestReading.timestamp) / 60000);
    const alert = latestReading.value < 70 ? " ⚠ LOW" : latestReading.value > 180 ? " ⚠ HIGH" : "";

    // Mini sparkline from history (last 6 readings)
    const spark = history.slice(-6).map(r => {
      if (r.value < 70) return "▁";
      if (r.value < 100) return "▂";
      if (r.value < 140) return "▄";
      if (r.value < 180) return "▆";
      return "█";
    }).join("");

    glucoseText = `BG: ${latestReading.value} ${arrow}${alert}\n${age}m ago  ${spark}\n─────────\nRange: 70-180 mg/dL`;
  }

  const container = {
    type: "text",
    name: "glucose",
    text: glucoseText,
    isEventCapture: 1,
  };

  try {
    bridge.createStartUpPageContainer(JSON.stringify([container]));
  } catch {
    bridge.rebuildPageContainer(JSON.stringify([container]));
  }
}

init().catch(console.error);
