import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream, missingKeyResponse } from "../lib/fetch";

const PRODUCT = "regulatory";
const CACHE_TTL = 3600;
const EDGAR_HEADERS = { "User-Agent": "DevDrops/1.0 api@devdrops.run", Accept: "application/json" };

const regulatory = new Hono<{ Bindings: Env }>();

// GET /api/regulatory/search?q=financial+conduct&source=all
regulatory.get("/search", async (c) => {
  const q = c.req.query("q");
  if (!q) return c.json({ error: "Missing 'q' query param" }, 400);

  const source = c.req.query("source") ?? "all";
  const cacheKey = `search:${source}:${q}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const sources: Record<string, unknown> = {};

  if (source === "all" || source === "sec") {
    sources.sec = await searchSECEdgar(q);
  }
  if ((source === "all" || source === "uk") && c.env.COMPANIES_HOUSE_API_KEY) {
    sources.companies_house = await searchCompaniesHouse(q, c.env.COMPANIES_HOUSE_API_KEY);
  }

  await setCache(c.env.DB, PRODUCT, cacheKey, sources, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data: sources, timestamp: new Date().toISOString() });
});

// GET /api/regulatory/sec/recent — recent SEC filings
regulatory.get("/sec/recent", async (c) => {
  const forms = c.req.query("forms") ?? "8-K,S-1,DEF 14A";
  const cacheKey = `sec:recent:${forms}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const data = await searchSECEdgar("*", forms);

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/regulatory/uk/company/:number — UK Companies House company profile
regulatory.get("/uk/company/:number", async (c) => {
  if (!c.env.COMPANIES_HOUSE_API_KEY) return c.json(missingKeyResponse("COMPANIES_HOUSE_API_KEY"), 503);

  const number = c.req.param("number");
  const cacheKey = `uk:company:${number}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const res = await fetchUpstream(`https://api.company-information.service.gov.uk/company/${number}`, {
    headers: { Authorization: `Basic ${btoa(c.env.COMPANIES_HOUSE_API_KEY + ":")}` },
  });
  const raw: any = await res.json();

  const data = {
    name: raw.company_name,
    number: raw.company_number,
    status: raw.company_status,
    type: raw.type,
    incorporated: raw.date_of_creation,
    dissolved: raw.date_of_cessation,
    address: raw.registered_office_address,
    sic_codes: raw.sic_codes,
    accounts_next_due: raw.accounts?.next_due,
    confirmation_next_due: raw.confirmation_statement?.next_due,
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/regulatory/uk/filings/:number — recent filings for a UK company
regulatory.get("/uk/filings/:number", async (c) => {
  if (!c.env.COMPANIES_HOUSE_API_KEY) return c.json(missingKeyResponse("COMPANIES_HOUSE_API_KEY"), 503);

  const number = c.req.param("number");
  const cacheKey = `uk:filings:${number}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const res = await fetchUpstream(`https://api.company-information.service.gov.uk/company/${number}/filing-history?items_per_page=20`, {
    headers: { Authorization: `Basic ${btoa(c.env.COMPANIES_HOUSE_API_KEY + ":")}` },
  });
  const raw: any = await res.json();

  const data = {
    company_number: number,
    total: raw.total_count,
    filings: raw.items?.map((f: any) => ({
      date: f.date,
      type: f.type,
      category: f.category,
      description: f.description,
      barcode: f.barcode,
    })),
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

async function searchSECEdgar(query: string, forms?: string) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString().split("T")[0];
    let url = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(query)}&dateRange=custom&startdt=${thirtyDaysAgo}&enddt=${today}`;
    if (forms) url += `&forms=${forms}`;

    const res = await fetchUpstream(url, { headers: EDGAR_HEADERS });
    const raw: any = await res.json();

    return {
      source: "SEC EDGAR",
      total: raw.hits?.total?.value,
      filings: raw.hits?.hits?.slice(0, 20).map((h: any) => ({
        entity: h._source?.entity_name,
        ticker: h._source?.ticker,
        form: h._source?.form_type,
        filed: h._source?.file_date,
        url: h._source?.file_url ? `https://www.sec.gov${h._source.file_url}` : null,
      })),
    };
  } catch {
    return { source: "SEC EDGAR", total: 0, filings: [] };
  }
}

async function searchCompaniesHouse(query: string, apiKey: string) {
  try {
    const res = await fetchUpstream(`https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(query)}&items_per_page=20`, {
      headers: { Authorization: `Basic ${btoa(apiKey + ":")}` },
    });
    const raw: any = await res.json();

    return {
      source: "UK Companies House",
      total: raw.total_results,
      companies: raw.items?.map((co: any) => ({
        name: co.title,
        number: co.company_number,
        status: co.company_status,
        type: co.company_type,
        incorporated: co.date_of_creation,
        address: co.address_snippet,
      })),
    };
  } catch {
    return { source: "UK Companies House", total: 0, companies: [] };
  }
}

export default regulatory;
