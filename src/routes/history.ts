import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "history";
const CACHE_TTL = 86400; // 24 hours (historical data doesn't change)
const BASE_URL = "https://en.wikipedia.org/api/rest_v1/feed/onthisday";

const history = new Hono<{ Bindings: Env }>();

// GET /api/history/today — events on today's date
history.get("/today", async (c) => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return fetchDay(c, mm, dd);
});

// GET /api/history/:mm/:dd — events on a specific date
history.get("/:mm/:dd", async (c) => {
  const mm = c.req.param("mm");
  const dd = c.req.param("dd");
  return fetchDay(c, mm, dd);
});

async function fetchDay(c: any, mm: string, dd: string) {
  const type = c.req.query("type") ?? "all"; // all, selected, births, deaths, events, holidays
  const cacheKey = `${mm}-${dd}:${type}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const url = `${BASE_URL}/${type}/${mm}/${dd}`;
  const res = await fetchUpstream(url, {
    headers: { Accept: "application/json" },
  });
  const raw: any = await res.json();

  // Slim down the response — Wikipedia returns full article extracts
  const data: Record<string, unknown[]> = {};
  for (const [key, items] of Object.entries(raw)) {
    if (Array.isArray(items)) {
      data[key] = items.slice(0, 20).map((item: any) => ({
        year: item.year,
        text: item.text,
        pages: item.pages?.slice(0, 2).map((p: any) => ({
          title: p.title,
          description: p.description,
        })),
      }));
    }
  }

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, date: `${mm}-${dd}`, cached: false, data, timestamp: new Date().toISOString() });
}

history.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: ["/api/history/today", "/api/history/04/15"],
}, 400));

export default history;
