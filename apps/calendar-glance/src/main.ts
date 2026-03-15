import { waitForEvenAppBridge, type EvenAppBridge } from "@evenrealities/even_hub_sdk";

interface CalendarEvent {
  title: string;
  start: string;  // ISO
  end: string;
  location?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
let bridge: EvenAppBridge;
let events: CalendarEvent[] = [];
let selectedIndex = 0;

async function init() {
  bridge = await waitForEvenAppBridge();

  bridge.onEvenHubEvent((event: any) => {
    const type = event?.type || event?.eventType;
    if (type === "SCROLL_TOP" && selectedIndex > 0) { selectedIndex--; render(); }
    if (type === "SCROLL_BOTTOM" && selectedIndex < events.length - 1) { selectedIndex++; render(); }
    if (type === "CLICK") fetchAndRender();
  });

  await fetchAndRender();
  setInterval(fetchAndRender, 300_000); // refresh every 5 min
}

async function fetchAndRender() {
  try {
    const res = await fetch(`${API_BASE}/api/glasses/calendar`);
    if (res.ok) events = await res.json();
  } catch (e) {
    console.error("[Calendar] Fetch failed:", e);
  }
  render();
}

function render() {
  if (!bridge) return;

  const now = new Date();
  const lines = events.slice(0, 4).map((ev, i) => {
    const start = new Date(ev.start);
    const time = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const prefix = i === selectedIndex ? "▸ " : "  ";
    const active = start <= now && new Date(ev.end) >= now ? " NOW" : "";
    return `${prefix}${time} ${ev.title.slice(0, 25)}${active}`;
  });

  const text = events.length === 0
    ? "📅 Calendar\n─────────\nNo events today"
    : `📅 Today (${events.length})\n${lines.join("\n")}`;

  const container = { type: "text", name: "calendar", text, isEventCapture: 1 };
  try { bridge.createStartUpPageContainer(JSON.stringify([container])); }
  catch { bridge.rebuildPageContainer(JSON.stringify([container])); }
}

init().catch(console.error);
