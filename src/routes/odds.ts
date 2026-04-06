import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream, missingKeyResponse } from "../lib/fetch";

const PRODUCT = "odds";
const CACHE_TTL = 300; // 5 minutes (odds change frequently)
const BASE_URL = "https://api.the-odds-api.com/v4";

const odds = new Hono<{ Bindings: Env }>();

// GET /api/odds/sports — list available sports
odds.get("/sports", async (c) => {
  if (!c.env.ODDS_API_KEY) return c.json(missingKeyResponse("ODDS_API_KEY"), 503);

  const cacheKey = "sports";
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const url = `${BASE_URL}/sports?apiKey=${c.env.ODDS_API_KEY}`;
  const res = await fetchUpstream(url);
  const data = await res.json();

  await setCache(c.env.DB, PRODUCT, cacheKey, data, 3600);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/odds/events/:sport — upcoming events with odds for a sport
odds.get("/events/:sport", async (c) => {
  if (!c.env.ODDS_API_KEY) return c.json(missingKeyResponse("ODDS_API_KEY"), 503);

  const sport = c.req.param("sport");
  const regions = c.req.query("regions") ?? "us,uk,eu";
  const markets = c.req.query("markets") ?? "h2h";
  const cacheKey = `events:${sport}:${regions}:${markets}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const url = `${BASE_URL}/sports/${sport}/odds?apiKey=${c.env.ODDS_API_KEY}&regions=${regions}&markets=${markets}&oddsFormat=decimal`;
  const res = await fetchUpstream(url);
  const raw: any[] = await res.json();

  const data = raw.map((event) => ({
    id: event.id,
    sport: event.sport_key,
    home: event.home_team,
    away: event.away_team,
    commence: event.commence_time,
    bookmakers: event.bookmakers?.map((bm: any) => ({
      name: bm.key,
      title: bm.title,
      markets: bm.markets?.map((m: any) => ({
        key: m.key,
        outcomes: m.outcomes?.map((o: any) => ({
          name: o.name,
          price: o.price,
          point: o.point,
        })),
      })),
    })),
  }));

  const remaining = res.headers.get("x-requests-remaining");

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({
    product: PRODUCT,
    cached: false,
    data,
    api_requests_remaining: remaining,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/odds/scores/:sport — live and recent scores
odds.get("/scores/:sport", async (c) => {
  if (!c.env.ODDS_API_KEY) return c.json(missingKeyResponse("ODDS_API_KEY"), 503);

  const sport = c.req.param("sport");
  const cacheKey = `scores:${sport}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const url = `${BASE_URL}/sports/${sport}/scores?apiKey=${c.env.ODDS_API_KEY}&daysFrom=1`;
  const res = await fetchUpstream(url);
  const data = await res.json();

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

export default odds;
