import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// In production, this connects to the Telegram Bot API or OpenClaw gateway.
// For now, serves mock data for simulator testing.

interface Message {
  id: number;
  chat: string;
  sender: string;
  text: string;
  timestamp: number;
}

// TODO: Replace with real Telegram Bot API integration
// The plan: use OpenClaw's existing Telegram bot connection
// to relay messages to/from the glasses backend.
let mockMessages: Message[] = [
  { id: 1, chat: "SmartGlasses", sender: "Michael", text: "Testing the glasses HUD", timestamp: Date.now() - 60000 },
  { id: 2, chat: "Self Improvement", sender: "Macklemore", text: "Deployment complete, all green", timestamp: Date.now() - 30000 },
  { id: 3, chat: "Direct", sender: "Michael", text: "Check the new PR when you get a chance", timestamp: Date.now() },
];

// GET /api/glasses/messages — fetch latest messages for HUD display
app.get("/api/glasses/messages", (_req, res) => {
  res.json(mockMessages);
});

// POST /api/glasses/send — send a message from the glasses
app.post("/api/glasses/send", (req, res) => {
  const { chat, text } = req.body;
  if (!chat || !text) {
    res.status(400).json({ error: "chat and text required" });
    return;
  }
  // TODO: Forward to Telegram via Bot API or OpenClaw message tool
  console.log(`[GlassesBackend] Send to ${chat}: ${text}`);
  res.json({ ok: true });
});

// POST /api/glasses/voice — receive transcribed voice for sending
app.post("/api/glasses/voice", (req, res) => {
  const { audio_base64 } = req.body;
  // TODO: Send to Whisper API for transcription, then forward as message
  console.log(`[GlassesBackend] Voice received, ${audio_base64?.length || 0} bytes`);
  res.json({ ok: true, transcription: "[voice transcription placeholder]" });
});

app.listen(PORT, () => {
  console.log(`[GlassesBackend] Listening on :${PORT}`);
});
