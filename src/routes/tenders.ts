import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "tenders";
const CACHE_TTL = 3600; // 1 hour

const tenders = new Hono<{ Bindings: Env }>();

// GET /api/tenders/search?q=IT+services&country=uk
tenders.get("/search", async (c) => {
  const q = c.req.query("q");
  const country = c.req.query("country") ?? "uk";

  if (!q) return c.json({ error: "Missing 'q' query param" }, 400);

  const cacheKey = `search:${country}:${q}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  let data;
  switch (country.toLowerCase()) {
    case "uk":
      data = await searchUKContracts(q);
      break;
    case "us":
      data = await searchUSContracts(q, c.env.SAM_GOV_API_KEY);
      break;
    default:
      data = await searchUKContracts(q); // Default to UK
  }

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, country, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/tenders/uk/recent — recent UK contract notices
tenders.get("/uk/recent", async (c) => {
  const cacheKey = "uk:recent";
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const data = await searchUKContracts("*");
  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/tenders/us/recent — recent US federal opportunities
tenders.get("/us/recent", async (c) => {
  const cacheKey = "us:recent";
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const data = await searchUSContracts("", c.env.SAM_GOV_API_KEY);
  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

async function searchUKContracts(query: string) {
  try {
    const url = `https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?queryString=${encodeURIComponent(query)}&size=20&publishedFrom=${getDateDaysAgo(30)}`;
    const res = await fetchUpstream(url, { headers: { Accept: "application/json" } });
    const raw: any = await res.json();

    return {
      source: "UK Contracts Finder",
      total: raw.hitCount ?? raw.results?.length ?? 0,
      notices: (raw.results ?? []).slice(0, 20).map((r: any) => {
        const release = r.releases?.[0];
        const tender = release?.tender;
        return {
          id: release?.id,
          title: tender?.title ?? release?.tag?.[0],
          description: tender?.description?.substring(0, 300),
          value: tender?.value ? { amount: tender.value.amount, currency: tender.value.currency } : null,
          published: release?.date,
          deadline: tender?.tenderPeriod?.endDate,
          buyer: release?.buyer?.name,
          status: tender?.status,
        };
      }),
    };
  } catch {
    return { source: "UK Contracts Finder", total: 0, notices: [], error: "Service unavailable" };
  }
}

async function searchUSContracts(query: string, apiKey?: string) {
  try {
    const key = apiKey || "DEMO_KEY";
    const url = `https://api.sam.gov/opportunities/v2/search?api_key=${key}&limit=20&postedFrom=${getDateDaysAgo(30)}&postedTo=${getToday()}${query ? `&title=${encodeURIComponent(query)}` : ""}`;
    const res = await fetchUpstream(url);
    const raw: any = await res.json();

    return {
      source: "SAM.gov",
      total: raw.totalRecords ?? raw.opportunitiesData?.length ?? 0,
      notices: (raw.opportunitiesData ?? []).slice(0, 20).map((o: any) => ({
        id: o.noticeId,
        title: o.title,
        type: o.type,
        posted: o.postedDate,
        deadline: o.responseDeadLine,
        department: o.department,
        subtier: o.subtierAgency,
        set_aside: o.typeOfSetAside,
        url: o.uiLink,
      })),
    };
  } catch {
    return { source: "SAM.gov", total: 0, notices: [], error: "Service unavailable" };
  }
}

function getToday() {
  return new Date().toISOString().split("T")[0].replace(/-/g, "/");
}

function getDateDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0].replace(/-/g, "/");
}

tenders.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: ["/api/tenders/search?q=IT+services&country=uk", "/api/tenders/uk/recent", "/api/tenders/us/recent"],
}, 400));

export default tenders;
