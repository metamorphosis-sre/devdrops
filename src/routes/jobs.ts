import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream, missingKeyResponse } from "../lib/fetch";

// Powered by JSearch API via RapidAPI (https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch)
// Aggregates Indeed, LinkedIn, Glassdoor, ZipRecruiter, Dice, and more.
// Get key at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
// Set secret: JSEARCH_API_KEY

const PRODUCT = "jobs";
const CACHE_TTL = 3600; // 1 hour
const BASE_URL = "https://jsearch.p.rapidapi.com";

const jobs = new Hono<{ Bindings: Env }>();

// GET /api/jobs/search?q=software+engineer&location=London&country=gb&page=1
jobs.get("/search", async (c) => {
  if (!c.env.JSEARCH_API_KEY) {
    return c.json(missingKeyResponse("JSEARCH_API_KEY"), 503);
  }

  const q = c.req.query("q");
  const location = c.req.query("location");
  const page = c.req.query("page") ?? "1";

  if (!q) return c.json({ error: "Missing 'q' query param" }, 400);

  // JSearch takes a natural language query — combine q + location for best results
  const query = location ? `${q} in ${location}` : q;
  const cacheKey = `search:${query}:${page}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const url =
    `${BASE_URL}/search` +
    `?query=${encodeURIComponent(query)}` +
    `&page=${page}` +
    `&num_pages=1` +
    `&date_posted=all`;

  const res = await fetchUpstream(url, {
    headers: {
      "X-RapidAPI-Key": c.env.JSEARCH_API_KEY,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
  });
  const raw: any = await res.json();

  if (raw.status === "ERROR") {
    return c.json({ error: "Upstream error", detail: raw.error?.message }, 502);
  }

  const data = {
    query,
    page: parseInt(page),
    count: raw.data?.length ?? 0,
    results: raw.data?.map((j: any) => ({
      title: j.job_title,
      company: j.employer_name,
      location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", "),
      employment_type: j.job_employment_type,
      is_remote: j.job_is_remote,
      salary_min: j.job_min_salary,
      salary_max: j.job_max_salary,
      salary_currency: j.job_salary_currency,
      salary_period: j.job_salary_period,
      description: j.job_description?.substring(0, 400),
      posted: j.job_posted_at_datetime_utc,
      apply_url: j.job_apply_link,
      source: j.job_publisher,
    })),
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/jobs/salary?q=software+engineer&location=London,+UK
jobs.get("/salary", async (c) => {
  if (!c.env.JSEARCH_API_KEY) {
    return c.json(missingKeyResponse("JSEARCH_API_KEY"), 503);
  }

  const q = c.req.query("q");
  const location = c.req.query("location") ?? "United States";

  if (!q) return c.json({ error: "Missing 'q' query param" }, 400);

  const cacheKey = `salary:${q}:${location}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const url =
    `${BASE_URL}/estimated-salary` +
    `?job_title=${encodeURIComponent(q)}` +
    `&location=${encodeURIComponent(location)}` +
    `&radius=100`;

  const res = await fetchUpstream(url, {
    headers: {
      "X-RapidAPI-Key": c.env.JSEARCH_API_KEY,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
  });
  const raw: any = await res.json();

  if (raw.status === "ERROR") {
    return c.json({ error: "Upstream error", detail: raw.error?.message }, 502);
  }

  const data = {
    query: q,
    location,
    estimates: raw.data?.map((s: any) => ({
      title: s.job_title,
      location: s.location,
      publisher: s.publisher_name,
      min_salary: s.min_salary,
      max_salary: s.max_salary,
      median_salary: s.median_salary,
      salary_period: s.salary_period,
      salary_currency: s.salary_currency,
    })),
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/jobs/details?id=<job_id>  — full job details by JSearch job ID
jobs.get("/details", async (c) => {
  if (!c.env.JSEARCH_API_KEY) {
    return c.json(missingKeyResponse("JSEARCH_API_KEY"), 503);
  }

  const id = c.req.query("id");
  if (!id) return c.json({ error: "Missing 'id' query param" }, 400);

  const cacheKey = `details:${id}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const url = `${BASE_URL}/job-details?job_id=${encodeURIComponent(id)}`;
  const res = await fetchUpstream(url, {
    headers: {
      "X-RapidAPI-Key": c.env.JSEARCH_API_KEY,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
  });
  const raw: any = await res.json();

  if (raw.status === "ERROR") {
    return c.json({ error: "Upstream error", detail: raw.error?.message }, 502);
  }

  const job = raw.data?.[0];
  if (!job) return c.json({ error: "Job not found" }, 404);

  await setCache(c.env.DB, PRODUCT, cacheKey, job, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data: job, timestamp: new Date().toISOString() });
});

export default jobs;
