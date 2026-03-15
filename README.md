# Even Realities × OpenClaw

Smart glasses + AI agent integration. Plugins for **Even Realities G2** glasses and **R1** ring powered by [OpenClaw](https://github.com/openclaw/openclaw).

## Plugins

| Plugin | Description | Status |
|--------|-------------|--------|
| **telegram-hud** | Read & reply to Telegram messages on glasses. Voice reply via ring tap → Whisper → send. | 🔧 Building |
| **agent-notifications** | Push OpenClaw agent alerts to HUD (critical/high/normal priority). | 📋 Planned |
| **voice-command** | Ring tap → speak → Whisper → dispatch to agent → result on HUD. | 📋 Planned |
| **data-dashboard** | Rotating HUD widget: stock prices, signals, metrics. | 📋 Planned |
| **teleprompter** | Push notes/talking points to display. | 📋 Planned |

## Architecture

```
┌─────────────┐     BLE      ┌──────────────┐    WebView    ┌──────────────────┐
│  G2 Glasses  │◄────────────►│  Even iPhone  │◄────────────►│  Plugin Server   │
│  (display +  │              │  App          │              │  (this repo)     │
│   mic + R1)  │              └──────────────┘              │                  │
└─────────────┘                                             │  ┌────────────┐  │
                                                            │  │ Telegram   │  │
                                                            │  │ Bot API    │  │
                                                            │  ├────────────┤  │
                                                            │  │ OpenClaw   │  │
                                                            │  │ Agents     │  │
                                                            │  ├────────────┤  │
                                                            │  │ Whisper    │  │
                                                            │  │ STT        │  │
                                                            │  └────────────┘  │
                                                            └──────────────────┘
```

## Prerequisites

- Even Realities G2 glasses (paired via Even app)
- R1 ring (optional, for gesture input)
- iPhone with Even Realities app
- Node.js ≥ 20

## Quick Start

```bash
git clone https://github.com/mfethe1/even-realities-openclaw.git
cd even-realities-openclaw
cp .env.example .env   # Add your API keys
npm install
npm run dev
```

Open the Even app on iPhone → scan QR code (same Wi-Fi) → plugin loads on glasses.

## Deployment

1. **Dev (sideload):** `npm run dev` → QR scan from Even app (same network)
2. **Production:** `npm run pack` → `.ehpk` file → submit to Even Hub

## Display Specs

- 576 × 288 px per eye, 4-bit grayscale (16 green shades)
- Up to 4 containers per page (Text, List, Image)
- Input: tap, swipe, R1 ring gestures

## License

MIT
