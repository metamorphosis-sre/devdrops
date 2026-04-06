import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "calendar";
const CACHE_TTL = 3600; // 1 hour

const calendar = new Hono<{ Bindings: Env }>();

// GET /api/calendar/upcoming — upcoming financial events
calendar.get("/upcoming", async (c) => {
  const days = parseInt(c.req.query("days") ?? "7");
  const cacheKey = `upcoming:${days}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const [fed, ecb] = await Promise.allSettled([
    fetchFedSchedule(),
    fetchECBSchedule(),
  ]);

  const data = {
    fed_events: fed.status === "fulfilled" ? fed.value : [],
    ecb_events: ecb.status === "fulfilled" ? ecb.value : [],
    note: "Financial calendar aggregated from central bank public schedules",
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/calendar/fomc — FOMC meeting schedule
calendar.get("/fomc", async (c) => {
  const cacheKey = "fomc";
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const data = await fetchFedSchedule();

  await setCache(c.env.DB, PRODUCT, cacheKey, data, 86400);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/calendar/earnings?date=2026-04-06
calendar.get("/earnings", async (c) => {
  const date = c.req.query("date") ?? new Date().toISOString().split("T")[0];
  const cacheKey = `earnings:${date}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  // Use SEC EDGAR recent filings as a proxy for earnings-related activity
  try {
    const url = `https://efts.sec.gov/LATEST/search-index?q=*&forms=10-K,10-Q,8-K&dateRange=custom&startdt=${date}&enddt=${date}`;
    const res = await fetchUpstream(url, {
      headers: { "User-Agent": "DevDrops/1.0 api@devdrops.run", Accept: "application/json" },
    });
    const raw: any = await res.json();

    const data = {
      date,
      total_filings: raw.hits?.total?.value,
      filings: raw.hits?.hits?.slice(0, 30).map((h: any) => ({
        entity: h._source?.entity_name,
        ticker: h._source?.ticker,
        form: h._source?.form_type,
        filed: h._source?.file_date,
      })),
    };

    await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ product: PRODUCT, data: { date, filings: [] }, timestamp: new Date().toISOString() });
  }
});

async function fetchFedSchedule() {
  // The Federal Reserve publishes FOMC meeting dates publicly
  // This is a known schedule for 2026 — updated annually
  return {
    source: "Federal Reserve",
    meetings: [
      { date: "2026-01-27/2026-01-28", type: "FOMC Meeting" },
      { date: "2026-03-17/2026-03-18", type: "FOMC Meeting", projection: true },
      { date: "2026-04-28/2026-04-29", type: "FOMC Meeting" },
      { date: "2026-06-16/2026-06-17", type: "FOMC Meeting", projection: true },
      { date: "2026-07-28/2026-07-29", type: "FOMC Meeting" },
      { date: "2026-09-15/2026-09-16", type: "FOMC Meeting", projection: true },
      { date: "2026-10-27/2026-10-28", type: "FOMC Meeting" },
      { date: "2026-12-15/2026-12-16", type: "FOMC Meeting", projection: true },
    ],
  };
}

async function fetchECBSchedule() {
  return {
    source: "European Central Bank",
    meetings: [
      { date: "2026-01-22", type: "Governing Council (monetary policy)" },
      { date: "2026-03-05", type: "Governing Council (monetary policy)" },
      { date: "2026-04-16", type: "Governing Council (monetary policy)" },
      { date: "2026-06-04", type: "Governing Council (monetary policy)" },
      { date: "2026-07-16", type: "Governing Council (monetary policy)" },
      { date: "2026-09-10", type: "Governing Council (monetary policy)" },
      { date: "2026-10-22", type: "Governing Council (monetary policy)" },
      { date: "2026-12-10", type: "Governing Council (monetary policy)" },
    ],
  };
}

export default calendar;
