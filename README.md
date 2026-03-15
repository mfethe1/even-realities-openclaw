# Even Realities × OpenClaw

Custom apps for the **Even Realities G2** smart glasses and **R1 ring**, integrated with **OpenClaw** AI agents.

## Apps

| App | Description | Status |
|-----|-------------|--------|
| [Telegram HUD](apps/telegram-hud/) | Send/receive Telegram messages via voice or ring | 🚧 In Progress |
| [Agent Link](apps/agent-link/) | Talk to agents via voice, share your location | 🚧 In Progress |
| [Health HUD](apps/health-hud/) | Dexcom CGM glucose monitoring with alerts | 🚧 In Progress |
| [Calendar Glance](apps/calendar-glance/) | Today's events at a glance | 🚧 In Progress |
| Email HUD | Gmail inbox on glasses | 📋 Planned |
| iMessage/SMS | Text messages via glasses | 📋 Planned |

## Architecture

```
G2 Glasses ←BLE→ Even App (Flutter) ←SDK Bridge→ EvenHub Web Apps ←HTTP→ Backend
     ↕                                                                      ↕
  R1 Ring                                                           OpenClaw Gateway
                                                                     ↕         ↕
                                                                 Telegram   Agents
                                                                 Gmail     (Mack/Rosie/
                                                                 Calendar   Winnie/Lenny)
                                                                 Dexcom
                                                                 iMessage
                                                                 Location
```

## Features

- **Messaging**: Telegram, iMessage/SMS, email — view on glasses, reply via voice or quick templates
- **Health**: Dexcom CGM real-time glucose with trend arrows and range alerts
- **Calendar**: Google Calendar events with ring scrolling
- **Agent Link**: Voice commands to OpenClaw agents, agents can see your GPS location
- **R1 Ring**: Scroll, tap, double-tap to navigate all apps

## Quick Start

```bash
npm install -g @evenrealities/evenhub-cli @evenrealities/evenhub-simulator

# Pick an app
cd apps/telegram-hud  # or health-hud, calendar-glance, agent-link
npm install && npm run dev

# Simulator
evenhub-simulator http://localhost:5173

# Sideload to glasses
evenhub qr -p 5173  # scan from Even Hub app
```

## Backend

```bash
cd backend && npm install && npm run dev
```

Serves all apps on port 3000. In production, deploy to Railway.

See [DEPLOYMENT.md](DEPLOYMENT.md) for full guide.

## License

MIT
