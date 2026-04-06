import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream, missingKeyResponse } from "../lib/fetch";

const PRODUCT = "jobs";
const CACHE_TTL = 3600; // 1 hour

const jobs = new Hono<{ Bindings: Env }>();

// GET /api/jobs/search?q=software+engineer&location=London&country=gb
jobs.get("/search", async (c) => {
  if (!c.env.ADZUNA_APP_ID || !c.env.ADZUNA_API_KEY) {
    return c.json(missingKeyResponse("ADZUNA_APP_ID and ADZUNA_API_KEY"), 503);
  }

  const q = c.req.query("q");
  const locationQuery = c.req.query("location");
  const country = c.req.query("country") ?? "gb";
  const page = c.req.query("page") ?? "1";

  if (!q) return c.json({ error: "Missing 'q' query param" }, 400);

  const cacheKey = `search:${country}:${q}:${locationQuery}:${page}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  let url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?app_id=${c.env.ADZUNA_APP_ID}&app_key=${c.env.ADZUNA_API_KEY}&what=${encodeURIComponent(q)}&results_per_page=20`;
  if (locationQuery) url += `&where=${encodeURIComponent(locationQuery)}`;

  const res = await fetchUpstream(url);
  const raw: any = await res.json();

  const data = {
    count: raw.count,
    page: parseInt(page),
    results: raw.results?.map((j: any) => ({
      title: j.title,
      company: j.company?.display_name,
      location: j.location?.display_name,
      salary_min: j.salary_min,
      salary_max: j.salary_max,
      description: j.description?.substring(0, 300),
      created: j.created,
      contract_type: j.contract_type,
      contract_time: j.contract_time,
      category: j.category?.label,
      url: j.redirect_url,
    })),
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/jobs/salary?q=software+engineer&country=gb
jobs.get("/salary", async (c) => {
  if (!c.env.ADZUNA_APP_ID || !c.env.ADZUNA_API_KEY) {
    return c.json(missingKeyResponse("ADZUNA_APP_ID and ADZUNA_API_KEY"), 503);
  }

  const q = c.req.query("q");
  const country = c.req.query("country") ?? "gb";
  const locationQuery = c.req.query("location");

  if (!q) return c.json({ error: "Missing 'q' query param" }, 400);

  const cacheKey = `salary:${country}:${q}:${locationQuery}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  let url = `https://api.adzuna.com/v1/api/jobs/${country}/history?app_id=${c.env.ADZUNA_APP_ID}&app_key=${c.env.ADZUNA_API_KEY}&what=${encodeURIComponent(q)}&months=12`;
  if (locationQuery) url += `&where=${encodeURIComponent(locationQuery)}`;

  const res = await fetchUpstream(url);
  const raw: any = await res.json();

  const data = {
    query: q,
    country,
    location: locationQuery,
    salary_history: raw.month ? Object.entries(raw.month).map(([month, salary]) => ({ month, average_salary: salary })) : [],
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/jobs/categories?country=gb
jobs.get("/categories", async (c) => {
  if (!c.env.ADZUNA_APP_ID || !c.env.ADZUNA_API_KEY) {
    return c.json(missingKeyResponse("ADZUNA_APP_ID and ADZUNA_API_KEY"), 503);
  }

  const country = c.req.query("country") ?? "gb";
  const cacheKey = `categories:${country}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/categories?app_id=${c.env.ADZUNA_APP_ID}&app_key=${c.env.ADZUNA_API_KEY}`;
  const res = await fetchUpstream(url);
  const data = await res.json();

  await setCache(c.env.DB, PRODUCT, cacheKey, data, 86400);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

export default jobs;
