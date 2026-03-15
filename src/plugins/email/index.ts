/**
 * Email Plugin — Gmail via Google Workspace API
 * 
 * - Inbox summary: show unread count + top 3 subjects on HUD
 * - Read email: swipe through, display sender + subject + snippet
 * - Send email: ring tap → dictate → Whisper → parse → Gmail API send
 * - Quick reply: tap on displayed email → dictate reply
 * 
 * Voice patterns:
 *   "Email John: meeting moved to 3pm"
 *   "Check email" → inbox summary
 *   "Reply: sounds good, see you then"
 */

export interface EmailSummary {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  timestamp: number;
  unread: boolean;
}

export function formatInboxForHUD(emails: EmailSummary[], unreadCount: number) {
  const lines = emails.slice(0, 3).map(
    (e) => `${e.unread ? '●' : '○'} ${e.from.split('<')[0].trim()}: ${e.subject.slice(0, 40)}`
  );
  return {
    containers: [
      { type: 'TextContainer' as const, text: `📧 Inbox (${unreadCount} unread)`, align: 'left' as const },
      { type: 'ListContainer' as const, items: lines },
      { type: 'TextContainer' as const, text: 'tap: read | swipe: more', align: 'center' as const },
    ],
  };
}

export function parseSendEmailCommand(transcript: string): { recipient: string; body: string } | null {
  const m = transcript.match(/^email\s+(.+?):\s+(.+)$/i);
  if (m) return { recipient: m[1].trim(), body: m[2].trim() };
  return null;
}
