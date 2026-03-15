import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';

async function main() {
  const bridge = await waitForEvenAppBridge();
  
  console.log('[OpenClaw] Bridge connected to G2 glasses');

  // Main menu
  await bridge.createStartUpPageContainer({
    containers: [
      {
        type: 'TextContainer',
        text: '⚡ OpenClaw HUD',
        align: 'center',
      },
      {
        type: 'ListContainer',
        items: [
          '1. Telegram Messages',
          '2. Agent Alerts', 
          '3. Voice Command',
        ],
      },
    ],
  });

  // Route input events
  bridge.onEvenHubEvent((event) => {
    console.log('[OpenClaw] Input event:', JSON.stringify(event));
    // TODO: plugin routing based on current view + gesture
  });
}

main().catch(console.error);
