/**
 * SMS Plugin — Send/receive text messages via Twilio
 * 
 * - Incoming: Twilio webhook → server → HUD display
 * - Outgoing: Ring tap → mic → Whisper → parse recipient + body → Twilio send
 * - Contact lookup from Google Contacts
 * 
 * Voice patterns:
 *   "Text Mom: I'll be home in 20 minutes"
 *   "Send message to 555-1234: running late"
 *   "Read texts" → shows unread on HUD
 */

export interface SMSMessage {
  from: string;
  to: string;
  body: string;
  timestamp: number;
  contactName?: string;
}

export function formatSMSForHUD(msg: SMSMessage) {
  const sender = msg.contactName || msg.from;
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return {
    containers: [
      { type: 'TextContainer' as const, text: `💬 ${sender} · ${time}`, align: 'left' as const },
      { type: 'TextContainer' as const, text: msg.body.slice(0, 140), align: 'left' as const },
      { type: 'TextContainer' as const, text: 'tap: reply | swipe: next', align: 'center' as const },
    ],
  };
}

export function parseSendCommand(transcript: string): { recipient: string; body: string } | null {
  // "text [name]: [message]" or "send message to [name]: [message]"
  const patterns = [
    /^(?:text|message|sms)\s+(.+?):\s+(.+)$/i,
    /^send (?:text|message|sms) to\s+(.+?):\s+(.+)$/i,
  ];
  for (const p of patterns) {
    const m = transcript.match(p);
    if (m) return { recipient: m[1].trim(), body: m[2].trim() };
  }
  return null;
}
