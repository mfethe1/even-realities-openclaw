import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";

const router: Router = createRouter();

// ─── Reverse Geocoding (where am I?) ───
// Uses OpenStreetMap Nominatim — free, no key
router.get("/location-name", async (req: Request, res: Response) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) { res.json({ address: "Unknown" }); return; }
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18`,
      { headers: { "User-Agent": "EvenG2-CyberDeck/0.1 (protelynx.ai)" } }
    );
    const data = await r.json();
    res.json({
      address: data.display_name,
      road: data.address?.road,
      neighborhood: data.address?.neighbourhood || data.address?.suburb,
      city: data.address?.city || data.address?.town,
    });
  } catch (e) {
    res.json({ address: "Geocoding unavailable" });
  }
});

// ─── Nearby Points of Interest (OpenStreetMap Overpass) ───
router.get("/nearby-pois", async (req: Request, res: Response) => {
  const { lat, lon, radius } = req.query;
  const r = Number(radius) || 200; // meters
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"](around:${r},${lat},${lon});
      node["shop"](around:${r},${lat},${lon});
      node["tourism"](around:${r},${lat},${lon});
    );
    out body 10;
  `;
  try {
    const resp = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data = await resp.json();
    const pois = (data.elements || []).map((el: any) => ({
      name: el.tags?.name || el.tags?.amenity || el.tags?.shop || "Unknown",
      type: el.tags?.amenity || el.tags?.shop || el.tags?.tourism || "poi",
      lat: el.lat,
      lon: el.lon,
    }));
    res.json(pois);
  } catch {
    res.json([]);
  }
});

// ─── Weather (Open-Meteo — free, no key) ───
router.get("/weather", async (req: Request, res: Response) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) { res.json({ error: "need lat/lon" }); return; }
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,wind_speed_10m,relative_humidity_2m,weather_code,uv_index&temperature_unit=fahrenheit&wind_speed_unit=mph`
    );
    const data = await r.json();
    const c = data.current;
    const weatherCodes: Record<number, string> = {
      0: "Clear", 1: "Mostly Clear", 2: "Partly Cloudy", 3: "Overcast",
      45: "Foggy", 48: "Rime Fog", 51: "Light Drizzle", 53: "Drizzle",
      55: "Heavy Drizzle", 61: "Light Rain", 63: "Rain", 65: "Heavy Rain",
      71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 80: "Rain Showers",
      95: "Thunderstorm",
    };
    res.json({
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      wind: Math.round(c.wind_speed_10m),
      humidity: c.relative_humidity_2m,
      uv: c.uv_index,
      condition: weatherCodes[c.weather_code] || `Code ${c.weather_code}`,
    });
  } catch {
    res.json({ temp: 0, condition: "Unavailable" });
  }
});

// ─── Air Quality (Open-Meteo Air Quality — free, no key) ───
router.get("/air-quality", async (req: Request, res: Response) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) { res.json({ aqi: 0 }); return; }
  try {
    const r = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide`
    );
    const data = await r.json();
    const c = data.current;
    const aqiLabel = c.us_aqi <= 50 ? "Good" : c.us_aqi <= 100 ? "Moderate" : c.us_aqi <= 150 ? "Unhealthy(S)" : "Unhealthy";
    res.json({
      aqi: c.us_aqi,
      label: aqiLabel,
      pm25: c.pm2_5,
      pm10: c.pm10,
      ozone: c.ozone,
      no2: c.nitrogen_dioxide,
    });
  } catch {
    res.json({ aqi: 0, label: "Unavailable" });
  }
});

// ─── Aircraft Overhead (OpenSky Network — free, no key) ───
router.get("/aircraft", async (req: Request, res: Response) => {
  const { lat, lon } = req.query;
  const latN = Number(lat);
  const lonN = Number(lon);
  const box = 0.5; // ~50km box
  try {
    const r = await fetch(
      `https://opensky-network.org/api/states/all?lamin=${latN - box}&lomin=${lonN - box}&lamax=${latN + box}&lomax=${lonN + box}`
    );
    const data = await r.json();
    const planes = (data.states || []).slice(0, 6).map((s: any[]) => ({
      callsign: (s[1] || "").trim(),
      country: s[2],
      altitude: s[7] ? Math.round(s[7] * 3.281) : 0, // meters to feet
      velocity: s[9] ? Math.round(s[9] * 2.237) : 0, // m/s to mph
      heading: s[10] ? Math.round(s[10]) : 0,
    }));
    res.json(planes);
  } catch {
    res.json([]);
  }
});

// ─── Sun Position (sunrise-sunset.org — free, no key) ───
router.get("/sun", async (req: Request, res: Response) => {
  const { lat, lon } = req.query;
  try {
    const r = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`);
    const data = await r.json();
    const results = data.results;
    res.json({
      sunrise: results.sunrise,
      sunset: results.sunset,
      goldenHour: results.golden_hour,
      civilTwilight: results.civil_twilight_end,
      dayLength: results.day_length,
    });
  } catch {
    res.json({ sunrise: null, sunset: null });
  }
});

export default router;
