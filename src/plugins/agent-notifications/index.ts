/**
 * Agent Notifications Plugin
 * 
 * Receives alerts from OpenClaw agents and displays on G2 HUD.
 * Priority levels control display behavior:
 * - critical: persistent until acknowledged (ring tap)
 * - high: 10s display, vibration
 * - normal: 5s display
 * - low: queued, shown on swipe
 */

export type Priority = 'critical' | 'high' | 'normal' | 'low';

export interface AgentNotification {
  id: string;
  agent: 'lenny' | 'macklemore' | 'rosie' | 'winnie';
  priority: Priority;
  title: string;
  body: string;
  timestamp: number;
  acknowledged: boolean;
}

const AGENT_LABELS: Record<string, string> = {
  lenny: '🧠 Lenny',
  macklemore: '🔧 Mack',
  rosie: '📊 Rosie',
  winnie: '🎨 Winnie',
};

export function createNotificationContainers(notif: AgentNotification) {
  const label = AGENT_LABELS[notif.agent] || notif.agent;
  return {
    containers: [
      { type: 'TextContainer' as const, text: `${label}: ${notif.title}`, align: 'left' as const },
      { type: 'TextContainer' as const, text: notif.body, align: 'left' as const },
    ],
  };
}
