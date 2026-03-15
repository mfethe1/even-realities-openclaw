/**
 * Location Plugin — Share GPS with OpenClaw agents
 * 
 * Uses browser Geolocation API (available in Even app WebView)
 * to periodically send coordinates to the plugin server,
 * which stores them for agent access.
 * 
 * Features:
 * - Agents can query "where is Michael?" and get current location
 * - Context-aware responses (e.g., nearby restaurant suggestions)
 * - Geofence alerts (arrive at office → show today's meetings)
 * - Location shared only with our agent system, never third parties
 * 
 * Privacy:
 * - Location only sent when plugin is active
 * - Server stores only latest position (no history by default)
 * - Can be toggled off via ring gesture
 */

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy: number;     // meters
  altitude?: number;
  timestamp: number;
}

export interface Geofence {
  name: string;
  lat: number;
  lon: number;
  radiusMeters: number;
  onEnter?: string;     // action/notification to trigger
}

export function distanceMeters(a: LocationUpdate, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.latitude) * Math.PI) / 180;
  const dLon = ((b.lon - a.longitude) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function checkGeofences(loc: LocationUpdate, fences: Geofence[]): Geofence[] {
  return fences.filter((f) => distanceMeters(loc, { lat: f.lat, lon: f.lon }) <= f.radiusMeters);
}
