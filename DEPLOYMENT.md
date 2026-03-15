# Deploying to Your Glasses

## Development Flow (Fastest)

1. Run the app locally:
   ```bash
   cd apps/telegram-hud
   npm install && npm run dev
   ```

2. Option A — **Simulator** (no glasses needed):
   ```bash
   evenhub-simulator http://localhost:5173
   ```

3. Option B — **Sideload to glasses** via QR:
   ```bash
   evenhub qr -p 5173
   ```
   Then scan the QR code from the **Even Hub** tab in the Even Realities mobile app.
   Your phone and dev machine must be on the same network.

## Production Deployment

1. Build the app:
   ```bash
   cd apps/telegram-hud
   npm run build
   ```

2. Package as .ehpk:
   ```bash
   evenhub pack app.json ./dist -o telegram-hud.ehpk
   ```

3. Submit to Even Hub (requires developer account):
   ```bash
   evenhub login -e michael.fethe@protelynx.ai
   # Then submit through Even's developer portal
   ```

## Backend

The backend bridges the glasses app to Telegram:
```bash
cd backend
npm install && npm run dev
```

For production, deploy to Railway or similar and set `VITE_API_BASE` in the app.

## R1 Ring

No separate setup — the ring pairs through the Even app and sends input events
(SCROLL_TOP, SCROLL_BOTTOM, CLICK, DOUBLE_CLICK) that the app handles via
`bridge.onEvenHubEvent()`.
