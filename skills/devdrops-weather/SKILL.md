---
name: devdrops-weather
description: Get current weather conditions or a 5-day forecast for any city or coordinates. Free tier available. Powered by OpenWeatherMap.
---

## When to use this skill

- User wants current weather for a location
- Agent needs weather context for planning, routing, or content generation
- User asks "what's the weather in [city]?", "will it rain in [city] tomorrow?", or "get me a 5-day forecast for [coordinates]"
- Agent is building a travel assistant, logistics planner, or activity recommender

## How it works

The endpoint queries OpenWeatherMap's free-tier API. You can query by city name or by latitude/longitude coordinates. `/current` returns the current conditions; `/forecast` returns a 5-day, 3-hour forecast grid (40 data points). This endpoint costs $0.001 per query and is in the **free tier** (5 queries/day/IP before payment).

**Note:** When called with no parameters, the API returns 402 (payment required with schema). Provide either `?city=` or `?lat=&lon=` to get data.

## Endpoints

| Method | Path | Price | Required params | Optional params |
|--------|------|-------|-----------------|-----------------|
| GET | `/api/weather/current` | $0.001 | `city` OR `lat`+`lon` | — |
| GET | `/api/weather/forecast` | $0.001 | `city` OR `lat`+`lon` | `days` |

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `city` | string | City name (e.g. `London`, `New York`, `Tokyo`) |
| `lat` | number | Latitude (-90 to 90) |
| `lon` | number | Longitude (-180 to 180) |
| `days` | number | Forecast days (1–5, default 5) |

### Current weather response fields

| Field | Type | Description |
|-------|------|-------------|
| `location.name` | string | City name as returned by OWM |
| `location.country` | string | ISO 3166 country code |
| `conditions` | string | Weather description (e.g. "light rain") |
| `icon` | string | OWM icon code |
| `temperature.current` | number | Current temp (°C) |
| `temperature.feels_like` | number | Feels-like temp (°C) |
| `temperature.min` / `.max` | number | Day min/max (°C) |
| `humidity` | number | Humidity % |
| `wind.speed` | number | Wind speed (m/s) |
| `wind.direction` | number | Wind direction (degrees) |
| `visibility` | number | Visibility (metres) |
| `sunrise` / `sunset` | string | ISO 8601 timestamps |

## Quick start

### TypeScript (free tier — no payment needed)

```typescript
// City name
const res = await fetch("https://api.devdrops.run/api/weather/current?city=London");
const { data } = await res.json();
console.log(`${data.conditions}, ${data.temperature.current}°C`);

// Coordinates
const res2 = await fetch("https://api.devdrops.run/api/weather/current?lat=51.5&lon=-0.1");
```

### TypeScript (paid)

```typescript
import { wrapFetchWithPayment } from "@x402/fetch";
const pay = wrapFetchWithPayment(fetch, walletClient);
const res = await pay("https://api.devdrops.run/api/weather/forecast?city=Paris");
```

### curl

```bash
curl "https://api.devdrops.run/api/weather/current?city=Tokyo"
```

## Examples

### Example 1: Current conditions

```
GET /api/weather/current?city=London
```

```json
{
  "product": "weather",
  "cached": false,
  "data": {
    "location": { "name": "London", "country": "GB", "lat": 51.51, "lon": -0.13 },
    "conditions": "overcast clouds",
    "temperature": { "current": 12.4, "feels_like": 10.8, "min": 10.1, "max": 13.9 },
    "humidity": 82,
    "wind": { "speed": 5.1, "direction": 240, "gust": 8.2 },
    "visibility": 10000,
    "sunrise": "2026-04-25T05:19:00.000Z",
    "sunset": "2026-04-25T20:06:00.000Z"
  },
  "timestamp": "2026-04-25T14:00:00.000Z"
}
```

### Example 2: 5-day forecast

```
GET /api/weather/forecast?city=Berlin
```

Returns 40 data points (every 3 hours for 5 days) with temperature, conditions, humidity, wind, and precipitation.

### Example 3: Coordinate query

```
GET /api/weather/current?lat=48.8566&lon=2.3522
```

Returns current conditions for Paris by coordinates.

### Example 4: Travel assistant agent

```typescript
async function travelContext(cities: string[]) {
  const forecasts = await Promise.all(
    cities.map(city =>
      fetch(`https://api.devdrops.run/api/weather/current?city=${encodeURIComponent(city)}`)
        .then(r => r.json())
        .then(d => ({ city, temp: d.data?.temperature?.current, conditions: d.data?.conditions }))
    )
  );
  return forecasts;
}
```

### Example 5: Packing list assistant

```typescript
const res = await fetch("https://api.devdrops.run/api/weather/forecast?city=Edinburgh");
const { data } = await res.json();

const willRain = data.forecasts.some((f: any) => f.conditions.includes("rain"));
const maxTemp = Math.max(...data.forecasts.map((f: any) => f.temperature));
const minTemp = Math.min(...data.forecasts.map((f: any) => f.temperature));

const packingAdvice = [
  willRain && "umbrella",
  minTemp < 10 && "heavy jacket",
  maxTemp > 20 && "sunscreen",
].filter(Boolean);
```

## Errors & limits

| Status | Meaning |
|--------|---------|
| 402 | Payment required (free tier exhausted, or no params provided) |
| 503 | OpenWeatherMap API unavailable or API key issue |

**Free tier:** 5 queries/day/IP. Check `X-Free-Tier-Remaining` header.

**Caching:** Current weather cached 30 minutes. Forecast cached 30 minutes.

**City names:** OWM resolves most major city names. For ambiguous names (e.g. "Springfield"), prefer lat/lon. Non-ASCII names are supported.

**Units:** All temperatures in Celsius. Wind speed in metres/second. Visibility in metres.

## Related skills

- [devdrops-fx-rates](../devdrops-fx-rates/SKILL.md) — another free-tier utility
- [devdrops-research-brief](../devdrops-research-brief/SKILL.md) — combine weather context with research
