/**
 * Telegram HUD Plugin
 * 
 * Displays Telegram messages on G2 glasses and supports voice replies.
 * 
 * Flow:
 * 1. Server polls Telegram Bot API for new messages
 * 2. Messages pushed to glasses display via SDK containers
 * 3. Ring tap starts mic recording (PCM audio)
 * 4. Audio sent to server → Whisper transcription → Telegram reply
 * 5. Swipe left/right to navigate conversations
 * 6. Tap to mark read / dismiss
 */

export interface TelegramMessage {
  chatId: number;
  chatName: string;
  sender: string;
  text: string;
  timestamp: number;
  messageId: number;
}

export interface TelegramHUDState {
  messages: TelegramMessage[];
  currentIndex: number;
  isRecording: boolean;
}

export function formatForDisplay(msg: TelegramMessage): { title: string; body: string } {
  const time = new Date(msg.timestamp * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return {
    title: `${msg.sender} · ${time}`,
    body: msg.text.length > 120 ? msg.text.slice(0, 117) + '...' : msg.text,
  };
}

export function createMessageContainers(msg: TelegramMessage) {
  const { title, body } = formatForDisplay(msg);
  return {
    containers: [
      { type: 'TextContainer' as const, text: title, align: 'left' as const },
      { type: 'TextContainer' as const, text: body, align: 'left' as const },
      { type: 'TextContainer' as const, text: '← prev | tap reply | next →', align: 'center' as const },
    ],
  };
}
