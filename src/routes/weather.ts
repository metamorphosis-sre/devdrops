import { Hono } from "hono";
import type { Env } from "../types";
import { getTiered, setTiered } from "../lib/cache";
import { fetchUpstream, missingKeyResponse } from "../lib/fetch";

const PRODUCT = "weather";
const CACHE_TTL = 1800; // 30 minutes

const weather = new Hono<{ Bindings: Env }>();

// GET /api/weather/current?lat=51.5&lon=-0.1 or ?city=London
weather.get("/current", async (c) => {
  if (!c.env.WEATHER_API_KEY) return c.json(missingKeyResponse("WEATHER_API_KEY"), 503);

  const city = c.req.query("city");
  const lat = c.req.query("lat");
  const lon = c.req.query("lon");

  if (!city && (!lat || !lon)) return c.json({ error: "Provide 'city' or 'lat'+'lon'" }, 400);

  const q = city ? `q=${encodeURIComponent(city)}` : `lat=${lat}&lon=${lon}`;
  const cacheKey = `current:${city ?? `${lat},${lon}`}`;

  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?${q}&units=metric&appid=${c.env.WEATHER_API_KEY}`;
    const res = await fetchUpstream(url);
    const raw: any = await res.json();

    const data = {
      location: { name: raw.name, country: raw.sys?.country, lat: raw.coord?.lat, lon: raw.coord?.lon },
      conditions: raw.weather?.[0]?.description,
      icon: raw.weather?.[0]?.icon,
      temperature: { current: raw.main?.temp, feels_like: raw.main?.feels_like, min: raw.main?.temp_min, max: raw.main?.temp_max },
      humidity: raw.main?.humidity,
      pressure: raw.main?.pressure,
      wind: { speed: raw.wind?.speed, direction: raw.wind?.deg, gust: raw.wind?.gust },
      visibility: raw.visibility,
      clouds: raw.clouds?.all,
      sunrise: raw.sys?.sunrise ? new Date(raw.sys.sunrise * 1000).toISOString() : null,
      sunset: raw.sys?.sunset ? new Date(raw.sys.sunset * 1000).toISOString() : null,
    };

    await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "Weather service unavailable" }, 503);
  }
});

// GET /api/weather/forecast?city=London&days=5
weather.get("/forecast", async (c) => {
  if (!c.env.WEATHER_API_KEY) return c.json(missingKeyResponse("WEATHER_API_KEY"), 503);

  const city = c.req.query("city");
  const lat = c.req.query("lat");
  const lon = c.req.query("lon");

  if (!city && (!lat || !lon)) return c.json({ error: "Provide 'city' or 'lat'+'lon'" }, 400);

  const q = city ? `q=${encodeURIComponent(city)}` : `lat=${lat}&lon=${lon}`;
  const cacheKey = `forecast:${city ?? `${lat},${lon}`}`;

  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?${q}&units=metric&appid=${c.env.WEATHER_API_KEY}`;
    const res = await fetchUpstream(url);
    const raw: any = await res.json();

    const data = {
      location: { name: raw.city?.name, country: raw.city?.country },
      forecasts: raw.list?.map((f: any) => ({
        datetime: f.dt_txt,
        temperature: f.main?.temp,
        feels_like: f.main?.feels_like,
        conditions: f.weather?.[0]?.description,
        humidity: f.main?.humidity,
        wind_speed: f.wind?.speed,
        rain_3h: f.rain?.["3h"],
        snow_3h: f.snow?.["3h"],
      })),
    };

    await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "Weather forecast service unavailable" }, 503);
  }
});

weather.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: ["/api/weather/current?city=London", "/api/weather/forecast?city=London"],
}, 400));

export default weather;
