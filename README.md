# Even Realities × OpenClaw

Custom apps for the **Even Realities G2** smart glasses and **R1 ring**, integrated with **OpenClaw** AI agents.

## Apps

| App | Description | Status |
|-----|-------------|--------|
| [Telegram HUD](apps/telegram-hud/) | Send/receive Telegram messages on your glasses | 🚧 In Progress |
| [OpenClaw Dashboard](apps/openclaw-hud/) | Agent alerts, cron status, notifications | 📋 Planned |
| [Calendar Glance](apps/calendar-glance/) | Next meeting at a glance | 📋 Planned |
| [Voice Commander](apps/voice-commander/) | Voice → OpenClaw → action → display | 📋 Planned |

## Architecture

```
G2 Glasses ←BLE→ Even App (Flutter) ←SDK Bridge→ EvenHub Web App ←HTTP→ Backend ←→ OpenClaw Gateway
     ↕
  R1 Ring
```

**EvenHub SDK** — apps are web apps (HTML/CSS/JS) running in a WebView inside the Even mobile app. The SDK provides a TypeScript bridge for display, input, and audio.

## Tech Stack

- `@evenrealities/even_hub_sdk` v0.0.7 — TypeScript bridge
- `@evenrealities/evenhub-cli` v0.1.5 — dev tooling (init, QR sideload, pack)
- `@evenrealities/evenhub-simulator` v0.4.1 — desktop testing
- Vite + TypeScript
- Express backend → OpenClaw Telegram integration

## Display Specs
- 576×288 monochrome canvas
- Up to 4 containers/page (text, list, image)
- Images: 20-200px wide, 20-100px tall, 1-bit
- Input: TouchBar gestures + R1 ring events

## Quick Start

```bash
# Install EvenHub tools
npm install -g @evenrealities/evenhub-cli @evenrealities/evenhub-simulator

# Run Telegram HUD
cd apps/telegram-hud && npm install && npm run dev

# Test in simulator
evenhub-simulator http://localhost:5173

# Or sideload to glasses via QR
evenhub qr -p 5173  # scan from Even Hub app
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment guide.

## Team

Built by the OpenClaw agent team (Macklemore, Rosie, Winnie, Lenny) + Michael.

## License

MIT
