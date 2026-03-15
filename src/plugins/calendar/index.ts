/**
 * Calendar Plugin — Google Calendar API
 * 
 * - Show next 3 upcoming events on HUD
 * - Swipe to see more
 * - Persistent "next meeting in X min" widget
 * - Ring tap to hear event details via TTS (future)
 * 
 * Voice patterns:
 *   "What's on my calendar?"
 *   "Next meeting?"
 *   "Schedule meeting with [name] at [time]"
 */

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // ISO
  endTime: string;
  location?: string;
  attendees?: string[];
}

export function formatEventsForHUD(events: CalendarEvent[]) {
  if (events.length === 0) {
    return {
      containers: [
        { type: 'TextContainer' as const, text: '📅 No upcoming events', align: 'center' as const },
      ],
    };
  }

  const lines = events.slice(0, 3).map((e) => {
    const time = new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${time} — ${e.title.slice(0, 35)}`;
  });

  return {
    containers: [
      { type: 'TextContainer' as const, text: '📅 Upcoming', align: 'left' as const },
      { type: 'ListContainer' as const, items: lines },
      { type: 'TextContainer' as const, text: 'swipe: more | tap: details', align: 'center' as const },
    ],
  };
}

export function getTimeUntilNext(events: CalendarEvent[]): string | null {
  if (events.length === 0) return null;
  const now = Date.now();
  const next = new Date(events[0].startTime).getTime();
  const diffMin = Math.round((next - now) / 60000);
  if (diffMin < 0) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  return `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
}
