/**
 * Dexcom CGM Plugin — Continuous Glucose Monitor on HUD
 * 
 * Uses Dexcom Share API to poll glucose readings.
 * 
 * Features:
 * - Persistent corner widget: current glucose + trend arrow
 * - Configurable high/low alerts (flash + vibration cue)
 * - 3-hour mini trend on swipe
 * - Color-coded urgency (via grayscale intensity on G2)
 * 
 * Defaults:
 *   High alert: ≥ 250 mg/dL
 *   Low alert:  ≤ 70 mg/dL
 *   Urgent low: ≤ 55 mg/dL
 *   Poll interval: 5 minutes (matches CGM update rate)
 */

export interface GlucoseReading {
  value: number;       // mg/dL
  trend: TrendArrow;
  timestamp: number;
}

export type TrendArrow =
  | 'DoubleUp'     // ↑↑ rising fast
  | 'SingleUp'     // ↑
  | 'FortyFiveUp'  // ↗
  | 'Flat'         // →
  | 'FortyFiveDown'// ↘
  | 'SingleDown'   // ↓
  | 'DoubleDown'   // ↓↓ falling fast
  | 'Unknown';

const TREND_SYMBOLS: Record<TrendArrow, string> = {
  DoubleUp: '⬆⬆',
  SingleUp: '⬆',
  FortyFiveUp: '↗',
  Flat: '→',
  FortyFiveDown: '↘',
  SingleDown: '⬇',
  DoubleDown: '⬇⬇',
  Unknown: '?',
};

export interface DexcomConfig {
  highThreshold: number;
  lowThreshold: number;
  urgentLowThreshold: number;
  pollIntervalMs: number;
}

export const DEFAULT_CONFIG: DexcomConfig = {
  highThreshold: 250,
  lowThreshold: 70,
  urgentLowThreshold: 55,
  pollIntervalMs: 5 * 60 * 1000,
};

export function getAlertLevel(value: number, config = DEFAULT_CONFIG): 'urgent' | 'high' | 'low' | 'normal' {
  if (value <= config.urgentLowThreshold) return 'urgent';
  if (value <= config.lowThreshold) return 'low';
  if (value >= config.highThreshold) return 'high';
  return 'normal';
}

export function formatGlucoseWidget(reading: GlucoseReading, config = DEFAULT_CONFIG) {
  const arrow = TREND_SYMBOLS[reading.trend];
  const level = getAlertLevel(reading.value, config);
  const prefix = level === 'urgent' ? '⚠️ ' : level !== 'normal' ? '! ' : '';
  
  return {
    containers: [
      {
        type: 'TextContainer' as const,
        text: `${prefix}${reading.value} ${arrow} mg/dL`,
        align: 'right' as const,
      },
    ],
  };
}

export function formatGlucoseAlert(reading: GlucoseReading, config = DEFAULT_CONFIG) {
  const level = getAlertLevel(reading.value, config);
  const arrow = TREND_SYMBOLS[reading.trend];
  let msg: string;

  if (level === 'urgent') msg = `⚠️ URGENT LOW: ${reading.value} ${arrow}`;
  else if (level === 'low') msg = `Low glucose: ${reading.value} ${arrow}`;
  else if (level === 'high') msg = `High glucose: ${reading.value} ${arrow}`;
  else return null;

  return {
    containers: [
      { type: 'TextContainer' as const, text: msg, align: 'center' as const },
      { type: 'TextContainer' as const, text: 'tap to dismiss', align: 'center' as const },
    ],
  };
}
