import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream, missingKeyResponse } from "../lib/fetch";

const PRODUCT = "property";
const CACHE_TTL = 3600;

const property = new Hono<{ Bindings: Env }>();

// GET /api/property/uk/prices?postcode=SW1A+1AA — UK Land Registry price paid data
property.get("/uk/prices", async (c) => {
  const postcode = c.req.query("postcode");
  if (!postcode) return c.json({ error: "Missing 'postcode' query param" }, 400);

  const cacheKey = `uk:prices:${postcode}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  // UK Land Registry Linked Data API (free, no key)
  try {
    const encoded = encodeURIComponent(postcode.toUpperCase().replace(/\s+/g, "+"));
    const url = `https://landregistry.data.gov.uk/data/ppi/transaction-record.json?propertyAddress.postcode=${encoded}&_pageSize=20&_sort=-transactionDate`;
    const res = await fetchUpstream(url);
    const raw: any = await res.json();

    const data = {
      postcode: postcode.toUpperCase(),
      transactions: raw.result?.items?.map((t: any) => ({
        price: t.pricePaid,
        date: t.transactionDate,
        property_type: t.propertyType?.prefLabel,
        new_build: t.newBuild,
        tenure: t.estateType?.prefLabel,
        address: {
          paon: t.propertyAddress?.paon,
          street: t.propertyAddress?.street?.label,
          town: t.propertyAddress?.town?.label,
          district: t.propertyAddress?.district?.label,
          county: t.propertyAddress?.county?.label,
        },
      })) ?? [],
    };

    await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "Land Registry service unavailable" }, 503);
  }
});

// GET /api/property/uk/company/:number — properties linked to a company
property.get("/uk/company/:number", async (c) => {
  if (!c.env.COMPANIES_HOUSE_API_KEY) return c.json(missingKeyResponse("COMPANIES_HOUSE_API_KEY"), 503);

  const number = c.req.param("number");
  const cacheKey = `uk:company:${number}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  try {
    // Get company charges (mortgages/charges on property) from Companies House
    const res = await fetchUpstream(`https://api.company-information.service.gov.uk/company/${number}/charges`, {
      headers: { Authorization: `Basic ${btoa(c.env.COMPANIES_HOUSE_API_KEY + ":")}` },
    });
    const raw: any = await res.json();

    const data = {
      company_number: number,
      total_charges: raw.total_count,
      charges: raw.items?.slice(0, 20).map((ch: any) => ({
        status: ch.status,
        created: ch.created_on,
        delivered: ch.delivered_on,
        description: ch.particulars?.description,
        persons_entitled: ch.persons_entitled?.map((p: any) => p.name),
        secured_type: ch.classification?.type,
      })),
    };

    await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "Companies House charges service unavailable" }, 503);
  }
});

// GET /api/property/uk/index — UK House Price Index
property.get("/uk/index", async (c) => {
  const region = c.req.query("region") ?? "united-kingdom";
  const cacheKey = `uk:index:${region}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  try {
    const url = `https://landregistry.data.gov.uk/data/ukhpi/region/${region}.json?_pageSize=12&_sort=-ukhpi:refMonth`;
    const res = await fetchUpstream(url);
    const raw: any = await res.json();

    const data = {
      region,
      index_data: raw.result?.items?.map((item: any) => ({
        month: item["ukhpi:refMonth"],
        average_price: item["ukhpi:averagePrice"],
        annual_change: item["ukhpi:percentageAnnualChange"],
        monthly_change: item["ukhpi:percentageChange"],
        sales_volume: item["ukhpi:salesVolume"],
      })) ?? [],
    };

    await setCache(c.env.DB, PRODUCT, cacheKey, data, 86400);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "UK HPI service unavailable" }, 503);
  }
});

property.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: ["/api/property/uk/prices?postcode=SW1A+1AA", "/api/property/uk/company/00445790", "/api/property/uk/index?region=london"],
}, 400));

export default property;
