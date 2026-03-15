import { waitForEvenAppBridge, type EvenAppBridge } from "@evenrealities/even_hub_sdk";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
let bridge: EvenAppBridge;
let isRecording = false;
let lastResponse = "Tap to talk to your agents";
let locationInterval: ReturnType<typeof setInterval>;

async function init() {
  bridge = await waitForEvenAppBridge();

  // Start location sharing
  startLocationSharing();

  bridge.onEvenHubEvent((event: any) => {
    const type = event?.type || event?.eventType;
    if (type === "CLICK") toggleVoice();
    if (type === "DOUBLE_CLICK") fetchAgentStatus();

    // Handle audio data when recording
    if (type === "audio" && isRecording) {
      sendAudioChunk(event.data);
    }
  });

  render();
}

function startLocationSharing() {
  // Push location to backend every 30s so agents can see where Michael is
  const pushLocation = async () => {
    try {
      const deviceInfo = await bridge.getDeviceInfo();
      // The Even app provides device location through the bridge
      await fetch(`${API_BASE}/api/glasses/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: "michael",
          device: deviceInfo,
          timestamp: Date.now(),
        }),
      });
    } catch (e) {
      console.error("[AgentLink] Location push failed:", e);
    }
  };
  pushLocation();
  locationInterval = setInterval(pushLocation, 30_000);
}

async function toggleVoice() {
  if (!isRecording) {
    isRecording = true;
    bridge.audioControl(true); // start mic
    lastResponse = "🎙 Listening...";
    render();

    // Auto-stop after 10 seconds
    setTimeout(() => {
      if (isRecording) stopAndSend();
    }, 10_000);
  } else {
    await stopAndSend();
  }
}

async function stopAndSend() {
  isRecording = false;
  bridge.audioControl(false); // stop mic
  lastResponse = "Processing...";
  render();

  try {
    const res = await fetch(`${API_BASE}/api/glasses/agent-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "voice_complete", user: "michael" }),
    });
    if (res.ok) {
      const data = await res.json();
      lastResponse = data.response || "No response";
    }
  } catch (e) {
    lastResponse = "Error reaching agents";
  }
  render();
}

async function sendAudioChunk(data: any) {
  try {
    await fetch(`${API_BASE}/api/glasses/audio-chunk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: data, user: "michael" }),
    });
  } catch { /* best effort */ }
}

async function fetchAgentStatus() {
  lastResponse = "Checking agents...";
  render();
  try {
    const res = await fetch(`${API_BASE}/api/glasses/agent-status`);
    if (res.ok) {
      const data = await res.json();
      lastResponse = data.status || "All agents online";
    }
  } catch {
    lastResponse = "Cannot reach agents";
  }
  render();
}

function render() {
  if (!bridge) return;
  const icon = isRecording ? "🎙 Recording..." : "🤖 Agent Link";
  const text = `${icon}\n─────────\n${lastResponse}\n\n[tap=talk  2x=status]`;
  const container = { type: "text", name: "agent", text, isEventCapture: 1 };
  try { bridge.createStartUpPageContainer(JSON.stringify([container])); }
  catch { bridge.rebuildPageContainer(JSON.stringify([container])); }
}

init().catch(console.error);
