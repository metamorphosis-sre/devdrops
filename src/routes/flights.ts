import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream, missingKeyResponse } from "../lib/fetch";

const PRODUCT = "flights";
const CACHE_TTL = 1800; // 30 minutes

const flights = new Hono<{ Bindings: Env }>();

// GET /api/flights/search?origin=LHR&destination=JFK&date=2026-05-01
flights.get("/search", async (c) => {
  if (!c.env.AMADEUS_API_KEY || !c.env.AMADEUS_API_SECRET) {
    return c.json(missingKeyResponse("AMADEUS_API_KEY and AMADEUS_API_SECRET"), 503);
  }

  const origin = c.req.query("origin");
  const destination = c.req.query("destination");
  const date = c.req.query("date");
  const adults = c.req.query("adults") ?? "1";

  if (!origin || !destination || !date) {
    return c.json({ error: "Missing 'origin', 'destination', and 'date' query params" }, 400);
  }

  const cacheKey = `search:${origin}:${destination}:${date}:${adults}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  // Get Amadeus access token
  const token = await getAmadeusToken(c.env.AMADEUS_API_KEY, c.env.AMADEUS_API_SECRET);
  if (!token) return c.json({ error: "Amadeus authentication failed" }, 503);

  const url = `https://api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${date}&adults=${adults}&max=10&currencyCode=USD`;
  const res = await fetchUpstream(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const raw: any = await res.json();

  const data = {
    origin,
    destination,
    date,
    offers: raw.data?.map((offer: any) => ({
      price: { total: offer.price?.total, currency: offer.price?.currency },
      itineraries: offer.itineraries?.map((it: any) => ({
        duration: it.duration,
        segments: it.segments?.map((seg: any) => ({
          departure: { airport: seg.departure?.iataCode, time: seg.departure?.at },
          arrival: { airport: seg.arrival?.iataCode, time: seg.arrival?.at },
          carrier: seg.carrierCode,
          flight_number: `${seg.carrierCode}${seg.number}`,
          duration: seg.duration,
          aircraft: seg.aircraft?.code,
        })),
      })),
      booking_class: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin,
    })),
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/flights/airports?keyword=London
flights.get("/airports", async (c) => {
  if (!c.env.AMADEUS_API_KEY || !c.env.AMADEUS_API_SECRET) {
    return c.json(missingKeyResponse("AMADEUS_API_KEY and AMADEUS_API_SECRET"), 503);
  }

  const keyword = c.req.query("keyword");
  if (!keyword) return c.json({ error: "Missing 'keyword' query param" }, 400);

  const cacheKey = `airports:${keyword}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const token = await getAmadeusToken(c.env.AMADEUS_API_KEY, c.env.AMADEUS_API_SECRET);
  if (!token) return c.json({ error: "Amadeus authentication failed" }, 503);

  const url = `https://api.amadeus.com/v1/reference-data/locations?subType=AIRPORT&keyword=${encodeURIComponent(keyword)}&page[limit]=10`;
  const res = await fetchUpstream(url, { headers: { Authorization: `Bearer ${token}` } });
  const raw: any = await res.json();

  const data = raw.data?.map((loc: any) => ({
    iata: loc.iataCode,
    name: loc.name,
    city: loc.address?.cityName,
    country: loc.address?.countryCode,
  }));

  await setCache(c.env.DB, PRODUCT, cacheKey, data, 86400);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

async function getAmadeusToken(apiKey: string, apiSecret: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.amadeus.com/v1/security/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${apiKey}&client_secret=${apiSecret}`,
    });
    const raw: any = await res.json();
    return raw.access_token ?? null;
  } catch {
    return null;
  }
}

export default flights;
