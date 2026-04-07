import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "predictions";
const CACHE_TTL = 300; // 5 minutes (markets move fast)

const predictions = new Hono<{ Bindings: Env }>();

// GET /api/predictions/markets — trending/active markets across platforms
predictions.get("/markets", async (c) => {
  const limit = parseInt(c.req.query("limit") ?? "20");
  const cacheKey = `markets:${limit}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const [polymarket, manifold] = await Promise.allSettled([
    fetchPolymarketMarkets(limit),
    fetchManifoldMarkets(limit),
  ]);

  const data = {
    polymarket: polymarket.status === "fulfilled" ? polymarket.value : [],
    manifold: manifold.status === "fulfilled" ? manifold.value : [],
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/predictions/search?q=election
predictions.get("/search", async (c) => {
  const q = c.req.query("q");
  if (!q) return c.json({ error: "Missing 'q' query param" }, 400);

  const cacheKey = `search:${q}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const [manifold] = await Promise.allSettled([
    fetchManifoldSearch(q),
  ]);

  const data = {
    manifold: manifold.status === "fulfilled" ? manifold.value : [],
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/predictions/polymarket — Polymarket active markets
predictions.get("/polymarket", async (c) => {
  const cacheKey = "polymarket:active";
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const data = await fetchPolymarketMarkets(20);

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/predictions/manifold — Manifold trending markets
predictions.get("/manifold", async (c) => {
  const cacheKey = "manifold:trending";
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const data = await fetchManifoldMarkets(20);

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

async function fetchPolymarketMarkets(limit: number) {
  try {
    const res = await fetchUpstream(
      `https://gamma-api.polymarket.com/markets?limit=${limit}&active=true&closed=false&order=volume24hr&ascending=false`
    );
    const raw: any[] = await res.json();
    return raw.map((m) => ({
      id: m.conditionId ?? m.id,
      question: m.question,
      slug: m.slug,
      outcomes: m.outcomes,
      outcomePrices: m.outcomePrices,
      volume24hr: m.volume24hr,
      liquidity: m.liquidity,
      endDate: m.endDateIso,
      platform: "polymarket",
    }));
  } catch {
    return [];
  }
}

async function fetchManifoldMarkets(limit: number) {
  try {
    const res = await fetchUpstream(
      `https://api.manifold.markets/v0/search-markets?sort=liquidity&limit=${limit}&filter=open`
    );
    const raw: any[] = await res.json();
    return raw.map((m) => ({
      id: m.id,
      question: m.question,
      slug: m.slug,
      probability: m.probability,
      volume24hrs: m.volume24Hours,
      totalLiquidity: m.totalLiquidity,
      closeTime: m.closeTime ? new Date(m.closeTime).toISOString() : null,
      platform: "manifold",
    }));
  } catch {
    return [];
  }
}

async function fetchManifoldSearch(query: string) {
  try {
    const res = await fetchUpstream(
      `https://api.manifold.markets/v0/search-markets?term=${encodeURIComponent(query)}&limit=20&filter=open`
    );
    const raw: any[] = await res.json();
    return raw.map((m) => ({
      id: m.id,
      question: m.question,
      probability: m.probability,
      volume24hrs: m.volume24Hours,
      platform: "manifold",
    }));
  } catch {
    return [];
  }
}

predictions.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: ["/api/predictions/markets", "/api/predictions/search?q=election", "/api/predictions/polymarket", "/api/predictions/manifold"],
}, 400));

export default predictions;
