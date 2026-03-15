import { waitForEvenAppBridge, type EvenAppBridge } from "@evenrealities/even_hub_sdk";

interface TelegramMessage {
  id: number;
  chat: string;
  sender: string;
  text: string;
  timestamp: number;
}

// Configuration — set your backend URL
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

let bridge: EvenAppBridge;
let messages: TelegramMessage[] = [];
let selectedIndex = 0;
let currentView: "inbox" | "chat" | "reply" = "inbox";

async function init() {
  bridge = await waitForEvenAppBridge();
  console.log("[TelegramHUD] Bridge initialized");

  const device = await bridge.getDeviceInfo();
  console.log("[TelegramHUD] Device:", device?.model);

  // Listen for input events (ring scroll, tap, etc.)
  bridge.onEvenHubEvent((event: any) => {
    handleInput(event);
  });

  // Initial fetch
  await fetchMessages();
  renderInbox();
}

async function fetchMessages() {
  try {
    const res = await fetch(`${API_BASE}/api/glasses/messages`);
    if (res.ok) {
      messages = await res.json();
    }
  } catch (e) {
    console.error("[TelegramHUD] Fetch failed:", e);
    // Show error on glasses
    messages = [{ id: 0, chat: "System", sender: "Error", text: "Cannot reach server", timestamp: Date.now() }];
  }
}

function handleInput(event: any) {
  const type = event?.type || event?.eventType;

  switch (type) {
    case "SCROLL_TOP":
      if (selectedIndex > 0) selectedIndex--;
      render();
      break;
    case "SCROLL_BOTTOM":
      if (selectedIndex < messages.length - 1) selectedIndex++;
      render();
      break;
    case "CLICK":
      if (currentView === "inbox") {
        currentView = "chat";
        render();
      }
      break;
    case "DOUBLE_CLICK":
      if (currentView === "chat") {
        currentView = "inbox";
        render();
      }
      break;
  }
}

function render() {
  if (currentView === "inbox") renderInbox();
  else if (currentView === "chat") renderChat();
}

function renderInbox() {
  if (!bridge) return;

  // Build list container showing recent chats
  const listItems = messages.slice(0, 4).map((m, i) => {
    const prefix = i === selectedIndex ? "▸ " : "  ";
    const time = new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${prefix}${m.sender}: ${m.text.slice(0, 30)}`;
  });

  const containerData = {
    type: "text",
    name: "inbox",
    text: `📨 Telegram (${messages.length})\n${listItems.join("\n")}`,
    isEventCapture: 1,
  };

  try {
    bridge.createStartUpPageContainer(JSON.stringify([containerData]));
  } catch {
    bridge.rebuildPageContainer(JSON.stringify([containerData]));
  }
}

function renderChat() {
  if (!bridge || !messages[selectedIndex]) return;

  const msg = messages[selectedIndex];
  const containerData = {
    type: "text",
    name: "chat",
    text: `${msg.sender}\n${"─".repeat(20)}\n${msg.text}\n\n[double-tap to go back]`,
    isEventCapture: 1,
  };

  bridge.rebuildPageContainer(JSON.stringify([containerData]));
}

// Boot
init().catch(console.error);
