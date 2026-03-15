// Additional HUD panels for positional awareness

// ─── Compass direction label from degrees ───
function bearingToCompass(deg: number): string {
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

export interface WeatherData {
  temp: number;
  feelsLike: number;
  wind: number;
  humidity: number;
  uv: number;
  condition: string;
}

export interface AirQuality {
  aqi: number;
  label: string;
  pm25: number;
}

export interface POI {
  name: string;
  type: string;
  lat: number;
  lon: number;
}

export interface Aircraft {
  callsign: string;
  altitude: number;
  velocity: number;
  heading: number;
}

export interface LocationInfo {
  address: string;
  road?: string;
  neighborhood?: string;
}

export function drawWeatherPanel(ctx: CanvasRenderingContext2D, w: WeatherData, y0: number) {
  ctx.font = "bold 12px monospace";
  ctx.fillText("WEATHER", 12, y0 + 14);

  ctx.font = "bold 28px monospace";
  ctx.fillText(`${w.temp}°F`, 12, y0 + 46);

  ctx.font = "11px monospace";
  ctx.fillText(`Feels ${w.feelsLike}°F`, 12, y0 + 62);
  ctx.fillText(`${w.condition}`, 12, y0 + 76);

  // Right side stats
  const rx = 200;
  ctx.fillText(`Wind: ${w.wind} mph`, rx, y0 + 30);
  ctx.fillText(`Humidity: ${w.humidity}%`, rx, y0 + 46);
  ctx.fillText(`UV: ${w.uv}`, rx, y0 + 62);
}

export function drawAirQualityPanel(ctx: CanvasRenderingContext2D, aq: AirQuality, x: number, y0: number) {
  ctx.strokeRect(x, y0, 140, 50);
  ctx.font = "10px monospace";
  ctx.fillText("AIR QUALITY", x + 6, y0 + 14);
  ctx.font = "bold 20px monospace";
  ctx.fillText(`${aq.aqi}`, x + 6, y0 + 36);
  ctx.font = "11px monospace";
  ctx.fillText(aq.label, x + 50, y0 + 36);
  ctx.fillText(`PM2.5: ${aq.pm25}`, x + 6, y0 + 48);
}

export function drawPOIPanel(ctx: CanvasRenderingContext2D, pois: POI[], location: LocationInfo, y0: number) {
  ctx.font = "bold 12px monospace";
  ctx.fillText("NEARBY", 12, y0 + 14);

  // Current location
  ctx.font = "10px monospace";
  const road = location.road || location.neighborhood || location.address?.slice(0, 35) || "Unknown";
  ctx.fillText(`📍 ${road}`, 12, y0 + 28);

  // POIs
  pois.slice(0, 5).forEach((poi, i) => {
    ctx.font = "11px monospace";
    const icon = poi.type === "restaurant" || poi.type === "cafe" ? "☕" :
                 poi.type === "pharmacy" ? "💊" :
                 poi.type === "fuel" ? "⛽" :
                 poi.type === "parking" ? "🅿" : "•";
    ctx.fillText(`${icon} ${poi.name.slice(0, 35)}`, 12, y0 + 42 + i * 13);
  });
}

export function drawAircraftPanel(ctx: CanvasRenderingContext2D, planes: Aircraft[], W: number, y0: number) {
  ctx.font = "bold 12px monospace";
  ctx.fillText("AIRCRAFT OVERHEAD", 12, y0 + 14);

  if (planes.length === 0) {
    ctx.font = "11px monospace";
    ctx.fillText("No aircraft detected", 12, y0 + 32);
    return;
  }

  // Header
  ctx.font = "10px monospace";
  ctx.fillText("CALL       ALT ft    SPD mph  HDG", 12, y0 + 28);

  planes.slice(0, 4).forEach((p, i) => {
    ctx.font = "11px monospace";
    const call = (p.callsign || "???").padEnd(10);
    const alt = String(p.altitude).padStart(6);
    const spd = String(p.velocity).padStart(4);
    const hdg = `${p.heading}°`.padStart(5);
    ctx.fillText(`${call} ${alt}  ${spd}   ${hdg}`, 12, y0 + 42 + i * 13);
  });

  // Compass rose (tiny)
  const cx = W - 45;
  const cy = y0 + 50;
  ctx.beginPath(); ctx.arc(cx, cy, 25, 0, Math.PI * 2); ctx.stroke();
  ctx.font = "8px monospace";
  ctx.fillText("N", cx - 3, cy - 28);
  ctx.fillText("S", cx - 3, cy + 35);
  ctx.fillText("E", cx + 28, cy + 3);
  ctx.fillText("W", cx - 34, cy + 3);

  // Plot aircraft heading as dots
  planes.slice(0, 4).forEach((p) => {
    const rad = (p.heading - 90) * Math.PI / 180;
    const dx = cx + Math.cos(rad) * 18;
    const dy = cy + Math.sin(rad) * 18;
    ctx.fillRect(dx - 2, dy - 2, 4, 4);
  });
}

// ─── Radar Panel ───────────────────────────────────────────────────────────
export interface SpatialDevice {
  name: string;
  type: "wifi" | "ble";
  rssi: number;
  bearing: number;   // absolute bearing (0=N, 90=E, etc.)
  distance: number;  // metres
}

export interface SpatialData {
  heading: number;         // current compass heading
  devices: SpatialDevice[];
}

/**
 * drawRadarPanel — compass-locked 180° forward-arc spatial radar.
 *
 * Canvas layout (576 × 136, white-on-black, monospace):
 *   Row 0-16 : header bar  "RADAR    HDG: 247° WSW"
 *   Row 17-110: half-circle arc with concentric rings + device dots
 *   Row 111-136: "VIS:N/M devices  [edge arrow indicators]"
 *
 * Device coordinate mapping:
 *   relBearing = (absoluteBearing - heading + 360) % 360
 *   If relBearing ≤ 180  → inside 180° FOV, plot on arc
 *   Else                 → behind user, show edge arrow
 *
 * Arc geometry (half-circle opening downward so "forward" = top-centre):
 *   angle = relBearing mapped to [-90°..+90°] → canvas radians
 *   radius = log-scale mapped to ring radii [25m max → innerRadius]
 */
export function drawRadarPanel(
  ctx: CanvasRenderingContext2D,
  spatial: SpatialData,
  W: number,
  H: number,
  y0: number
) {
  const { heading, devices } = spatial;

  // ── Header bar ──────────────────────────────────────────────────────────
  ctx.font = "bold 12px monospace";
  ctx.fillText("RADAR", 12, y0 + 14);
  const compass = bearingToCompass(heading);
  const hdgLabel = `HDG: ${heading}°  ${compass}`;
  const hdgW = ctx.measureText(hdgLabel).width;
  ctx.font = "11px monospace";
  ctx.fillText(hdgLabel, W - hdgW - 12, y0 + 14);

  // Separator
  ctx.beginPath();
  ctx.moveTo(8, y0 + 18);
  ctx.lineTo(W - 8, y0 + 18);
  ctx.stroke();

  // ── Radar geometry ──────────────────────────────────────────────────────
  // Arc centre near bottom of the usable area; arc opens upward (user looks forward = up)
  const contentH = H - y0 - 28; // space for content between header and footer
  const arcRadius = Math.min(contentH - 4, (W - 80) / 2); // max radius fits the panel
  const cx = W / 2;
  const cy = y0 + 18 + arcRadius + 4; // centre sits below header line

  // Distance rings (metres) mapped to pixel radii
  const distRings = [2, 5, 10, 25];
  const maxDistM = 25;

  function distToRadius(d: number): number {
    // Log scale: 1m → ~15% of arcRadius, 25m → 100%
    const clamped = Math.min(d, maxDistM);
    return (Math.log(clamped + 1) / Math.log(maxDistM + 1)) * arcRadius;
  }

  // Draw concentric distance rings (half arcs opening upward)
  ctx.save();
  ctx.setLineDash([3, 4]);
  distRings.forEach((dm) => {
    const r = distToRadius(dm);
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI); // half-circle opening upward
    ctx.stroke();

    // Distance label at bottom-left of ring
    ctx.font = "8px monospace";
    ctx.fillStyle = "#888";
    ctx.fillText(`${dm}m`, cx - r - 1, cy + 10);
    ctx.fillStyle = "#fff";
  });
  ctx.setLineDash([]);
  ctx.restore();

  // Main 180° arc
  ctx.beginPath();
  ctx.arc(cx, cy, arcRadius, Math.PI, 2 * Math.PI);
  ctx.stroke();

  // Centre cross-hair (small)
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy);
  ctx.lineTo(cx + 5, cy);
  ctx.moveTo(cx, cy - 5);
  ctx.lineTo(cx, cy + 2);
  ctx.stroke();

  // Forward direction tick at top of arc
  ctx.fillRect(cx - 1, cy - arcRadius - 4, 2, 6);
  ctx.font = "8px monospace";
  ctx.fillText("FWD", cx - 9, cy - arcRadius - 7);

  // ── Plot devices ────────────────────────────────────────────────────────
  const visible: SpatialDevice[] = [];
  const behind: SpatialDevice[] = [];

  devices.forEach((d) => {
    const rel = ((d.bearing - heading) % 360 + 360) % 360; // 0-359
    if (rel <= 180) {
      visible.push({ ...d, bearing: rel }); // store relative bearing for drawing
    } else {
      behind.push(d);
    }
  });

  // Draw visible devices on arc
  visible.forEach((d) => {
    // Map 0° (forward) → top-centre, 90° right → right, -90°/270° left → left
    // relBearing 0..180 → canvas angle: -90° + relBearing = -90° to +90°
    const relDeg = d.bearing; // already relative (0=forward, 90=right, 180=directly behind edge)
    const canvasAngle = (relDeg - 90) * (Math.PI / 180); // -π/2 to +π/2
    const r = distToRadius(d.distance);

    const dx = cx + Math.cos(canvasAngle) * r;
    const dy = cy + Math.sin(canvasAngle) * r;

    // Dot
    ctx.fillRect(dx - 3, dy - 3, 6, 6);

    // Label: truncated name + type icon
    const icon = d.type === "wifi" ? "W" : "B";
    const label = `${icon}:${d.name.slice(0, 8)}`;
    ctx.font = "8px monospace";

    // Position label so it doesn't go off-canvas
    let lx = dx + 5;
    let ly = dy - 4;
    if (lx + 60 > W - 8) lx = dx - 65;
    if (ly < y0 + 20) ly = dy + 12;
    ctx.fillText(label, lx, ly);
  });

  // ── Edge arrows for behind-you devices ──────────────────────────────────
  const leftCount = behind.filter((d) => {
    const rel = ((d.bearing - heading) % 360 + 360) % 360;
    return rel > 180 && rel <= 270; // more left than right
  }).length;
  const rightCount = behind.length - leftCount;

  const footerY = H - 8;
  ctx.font = "10px monospace";

  if (leftCount > 0) {
    ctx.fillText(`←${leftCount}`, 12, footerY);
  }
  if (rightCount > 0) {
    ctx.fillText(`${rightCount}→`, W - 30, footerY);
  }

  // ── Footer: device count ────────────────────────────────────────────────
  const countLabel = `VIS: ${visible.length}/${devices.length} devices`;
  const clW = ctx.measureText(countLabel).width;
  ctx.font = "9px monospace";
  ctx.fillStyle = "#aaa";
  ctx.fillText(countLabel, cx - clW / 2, footerY);
  ctx.fillStyle = "#fff";
}
