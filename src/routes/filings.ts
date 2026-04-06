import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "filings";
const CACHE_TTL = 3600; // 1 hour
const EDGAR_BASE = "https://efts.sec.gov/LATEST";
const EDGAR_HEADERS = { "User-Agent": "DevDrops/1.0 api@devdrops.run", Accept: "application/json" };

const filings = new Hono<{ Bindings: Env }>();

// GET /api/filings/search?q=apple — full-text search across SEC filings
filings.get("/search", async (c) => {
  const q = c.req.query("q");
  if (!q) return c.json({ error: "Missing 'q' query param" }, 400);

  const dateRange = c.req.query("dateRange"); // e.g. "2025-01-01,2026-01-01"
  const forms = c.req.query("forms"); // e.g. "10-K,10-Q"
  const cacheKey = `search:${q}:${dateRange}:${forms}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  let url = `${EDGAR_BASE}/search-index?q=${encodeURIComponent(q)}&dateRange=custom`;
  if (dateRange) url += `&startdt=${dateRange.split(",")[0]}&enddt=${dateRange.split(",")[1]}`;
  if (forms) url += `&forms=${forms}`;

  const res = await fetchUpstream(url, { headers: EDGAR_HEADERS });
  const raw: any = await res.json();

  const data = {
    total: raw.hits?.total?.value,
    results: raw.hits?.hits?.slice(0, 20).map((h: any) => ({
      entity: h._source?.entity_name,
      ticker: h._source?.ticker,
      cik: h._source?.entity_id,
      form: h._source?.form_type,
      filed: h._source?.file_date,
      description: h._source?.display_names?.join(", "),
      url: h._source?.file_url ? `https://www.sec.gov${h._source.file_url}` : null,
    })),
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/filings/company/:ticker — recent filings for a company
filings.get("/company/:ticker", async (c) => {
  const ticker = c.req.param("ticker").toUpperCase();
  const cacheKey = `company:${ticker}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  // First resolve ticker to CIK
  const tickerRes = await fetchUpstream(
    `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${ticker}&type=&dateb=&owner=include&count=5&search_text=&action=getcompany&output=atom`,
    { headers: EDGAR_HEADERS }
  );
  const tickerText = await tickerRes.text();

  // Also try the submissions API
  const submissionsRes = await fetchUpstream(
    `https://efts.sec.gov/LATEST/search-index?q=%22${ticker}%22&forms=10-K,10-Q,8-K&dateRange=custom&startdt=${getDateMonthsAgo(12)}&enddt=${getToday()}`,
    { headers: EDGAR_HEADERS }
  );
  const raw: any = await submissionsRes.json();

  const data = {
    ticker,
    total: raw.hits?.total?.value,
    filings: raw.hits?.hits?.slice(0, 20).map((h: any) => ({
      entity: h._source?.entity_name,
      form: h._source?.form_type,
      filed: h._source?.file_date,
      description: h._source?.display_names?.join(", "),
      url: h._source?.file_url ? `https://www.sec.gov${h._source.file_url}` : null,
    })),
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/filings/recent — latest filings across all companies
filings.get("/recent", async (c) => {
  const forms = c.req.query("forms") ?? "10-K,10-Q,8-K";
  const cacheKey = `recent:${forms}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const url = `${EDGAR_BASE}/search-index?q=*&forms=${forms}&dateRange=custom&startdt=${getToday()}&enddt=${getToday()}`;
  const res = await fetchUpstream(url, { headers: EDGAR_HEADERS });
  const raw: any = await res.json();

  const data = {
    date: getToday(),
    total: raw.hits?.total?.value,
    filings: raw.hits?.hits?.slice(0, 30).map((h: any) => ({
      entity: h._source?.entity_name,
      ticker: h._source?.ticker,
      form: h._source?.form_type,
      filed: h._source?.file_date,
      url: h._source?.file_url ? `https://www.sec.gov${h._source.file_url}` : null,
    })),
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getDateMonthsAgo(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split("T")[0];
}

export default filings;
