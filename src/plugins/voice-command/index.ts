/**
 * Voice Command Plugin
 * 
 * Ring tap → G2 mic records → PCM audio to server →
 * Whisper transcription → OpenClaw agent dispatch →
 * Response displayed on HUD
 * 
 * Commands are routed by keyword:
 * - "hey lenny" / "check" / "verify" → Lenny (QA)
 * - "hey mack" / "deploy" / "server" → Macklemore (Infra)
 * - "hey rosie" / "research" / "analyze" → Rosie (Analyst)
 * - "hey winnie" / "build" / "design" → Winnie (Product)
 * - Default → routes to nearest available agent
 */

export interface VoiceCommand {
  transcript: string;
  confidence: number;
  targetAgent?: string;
  timestamp: number;
}

export interface VoiceResponse {
  agent: string;
  text: string;
  truncated: boolean;
}

const AGENT_KEYWORDS: Record<string, string[]> = {
  lenny: ['lenny', 'check', 'verify', 'test', 'qa'],
  macklemore: ['mack', 'macklemore', 'deploy', 'server', 'infra'],
  rosie: ['rosie', 'research', 'analyze', 'report', 'data'],
  winnie: ['winnie', 'build', 'design', 'create', 'feature'],
};

export function routeCommand(transcript: string): string | undefined {
  const lower = transcript.toLowerCase();
  for (const [agent, keywords] of Object.entries(AGENT_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return agent;
  }
  return undefined;
}

export function formatResponseForHUD(resp: VoiceResponse) {
  const display = resp.text.length > 200 ? resp.text.slice(0, 197) + '...' : resp.text;
  return {
    containers: [
      { type: 'TextContainer' as const, text: `🎤 → ${resp.agent}`, align: 'left' as const },
      { type: 'TextContainer' as const, text: display, align: 'left' as const },
    ],
  };
}
