// Additional HUD panels for positional awareness

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
