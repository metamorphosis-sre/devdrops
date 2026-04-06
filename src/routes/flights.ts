import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream, missingKeyResponse } from "../lib/fetch";

// Powered by Kiwi Tequila API (https://tequila.kiwi.com)
// Register at: https://tequila.kiwi.com/register
// Set secret: KIWI_TEQUILA_API_KEY

const PRODUCT = "flights";
const CACHE_TTL = 1800; // 30 minutes
const BASE_URL = "https://api.tequila.kiwi.com";

const flights = new Hono<{ Bindings: Env }>();

// GET /api/flights/search?origin=LHR&destination=JFK&date=2026-05-01&adults=1
flights.get("/search", async (c) => {
  if (!c.env.KIWI_TEQUILA_API_KEY) {
    return c.json(missingKeyResponse("KIWI_TEQUILA_API_KEY"), 503);
  }

  const origin = c.req.query("origin");
  const destination = c.req.query("destination");
  const date = c.req.query("date"); // YYYY-MM-DD
  const adults = parseInt(c.req.query("adults") ?? "1");

  if (!origin || !destination || !date) {
    return c.json({ error: "Missing 'origin', 'destination', and 'date' query params" }, 400);
  }

  // Tequila expects DD/MM/YYYY
  const [yyyy, mm, dd] = date.split("-");
  if (!yyyy || !mm || !dd) {
    return c.json({ error: "Invalid date format — use YYYY-MM-DD" }, 400);
  }
  const tequilaDate = `${dd}/${mm}/${yyyy}`;

  const cacheKey = `search:${origin}:${destination}:${date}:${adults}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const url =
    `${BASE_URL}/v2/search` +
    `?fly_from=${encodeURIComponent(origin)}` +
    `&fly_to=${encodeURIComponent(destination)}` +
    `&date_from=${tequilaDate}` +
    `&date_to=${tequilaDate}` +
    `&adults=${adults}` +
    `&limit=10` +
    `&curr=USD` +
    `&sort=price`;

  const res = await fetchUpstream(url, {
    headers: { apikey: c.env.KIWI_TEQUILA_API_KEY },
  });
  const raw: any = await res.json();

  if (raw.error) {
    return c.json({ error: "Upstream error", detail: raw.error }, 502);
  }

  const data = {
    origin,
    destination,
    date,
    currency: "USD",
    offers: raw.data?.map((offer: any) => ({
      price: offer.price,
      duration_hours: Math.round(offer.duration?.total / 3600),
      stops: offer.route?.length - 1,
      airlines: [...new Set(offer.airlines ?? [])],
      departure: offer.local_departure,
      arrival: offer.local_arrival,
      deep_link: offer.deep_link,
      segments: offer.route?.map((seg: any) => ({
        from: seg.flyFrom,
        to: seg.flyTo,
        departure: seg.local_departure,
        arrival: seg.local_arrival,
        carrier: seg.airline,
        flight_number: seg.flight_no,
        aircraft: seg.equipment,
      })),
    })),
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/flights/airports?keyword=London
flights.get("/airports", async (c) => {
  if (!c.env.KIWI_TEQUILA_API_KEY) {
    return c.json(missingKeyResponse("KIWI_TEQUILA_API_KEY"), 503);
  }

  const keyword = c.req.query("keyword");
  if (!keyword) return c.json({ error: "Missing 'keyword' query param" }, 400);

  const cacheKey = `airports:${keyword}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const url =
    `${BASE_URL}/locations/query` +
    `?term=${encodeURIComponent(keyword)}` +
    `&locale=en-US` +
    `&location_types=airport` +
    `&limit=10`;

  const res = await fetchUpstream(url, {
    headers: { apikey: c.env.KIWI_TEQUILA_API_KEY },
  });
  const raw: any = await res.json();

  const data = raw.locations?.map((loc: any) => ({
    iata: loc.code,
    name: loc.name,
    city: loc.city?.name,
    country: loc.country?.name,
    country_code: loc.country?.code,
    lat: loc.location?.lat,
    lon: loc.location?.lon,
  }));

  await setCache(c.env.DB, PRODUCT, cacheKey, data, 86400);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

export default flights;
