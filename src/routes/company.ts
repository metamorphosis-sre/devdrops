import { Hono } from "hono";
import type { Env } from "../types";
import { getTiered, setTiered } from "../lib/cache";
import { fetchUpstream, missingKeyResponse } from "../lib/fetch";

const PRODUCT = "company";
const CACHE_TTL = 3600; // 1 hour

const company = new Hono<{ Bindings: Env }>();

// GET /api/company/uk/:number — full company profile from Companies House
company.get("/uk/:number", async (c) => {
  if (!c.env.COMPANIES_HOUSE_API_KEY) return c.json(missingKeyResponse("COMPANIES_HOUSE_API_KEY"), 503);

  const number = c.req.param("number").padStart(8, "0");
  const cacheKey = `uk:${number}`;

  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const [profile, officers, pscs, charges] = await Promise.allSettled([
    fetchCHProfile(number, c.env.COMPANIES_HOUSE_API_KEY),
    fetchCHOfficers(number, c.env.COMPANIES_HOUSE_API_KEY),
    fetchCHPSCs(number, c.env.COMPANIES_HOUSE_API_KEY),
    fetchCHCharges(number, c.env.COMPANIES_HOUSE_API_KEY),
  ]);

  if (profile.status === "rejected") {
    return c.json({ error: "Company not found", number }, 404);
  }

  const data = {
    ...profile.value,
    officers: officers.status === "fulfilled" ? officers.value : [],
    persons_with_significant_control: pscs.status === "fulfilled" ? pscs.value : [],
    charges: charges.status === "fulfilled" ? charges.value : [],
    source: "UK Companies House",
  };

  await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/company/search?q=apple&country=uk — search companies by name
company.get("/search", async (c) => {
  const q = c.req.query("q");
  if (!q) return c.json({ error: "Missing 'q' query param" }, 400);

  const country = c.req.query("country") ?? "uk";
  const cacheKey = `search:${country}:${q}`;

  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  try {
    let data: unknown;
    if (country === "uk") {
      if (!c.env.COMPANIES_HOUSE_API_KEY) return c.json(missingKeyResponse("COMPANIES_HOUSE_API_KEY"), 503);
      data = await searchCH(q, c.env.COMPANIES_HOUSE_API_KEY);
    } else {
      data = await searchOpenCorporates(q, country);
    }

    await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "Company search service unavailable" }, 503);
  }
});

// GET /api/company/domain?domain=apple.com — enrich company from website domain
company.get("/domain", async (c) => {
  const domain = c.req.query("domain");
  if (!domain) return c.json({ error: "Missing 'domain' query param" }, 400);

  const cacheKey = `domain:${domain}`;
  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const data = await enrichFromDomain(domain);

  await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

company.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: [
    "/api/company/uk/00445790",
    "/api/company/search?q=apple&country=uk",
    "/api/company/domain?domain=stripe.com",
  ],
}, 400));

function chAuth(apiKey: string) {
  return { Authorization: `Basic ${btoa(apiKey + ":")}` };
}

async function fetchCHProfile(number: string, apiKey: string) {
  const res = await fetchUpstream(`https://api.company-information.service.gov.uk/company/${number}`, {
    headers: chAuth(apiKey),
  });
  const raw: any = await res.json();

  return {
    name: raw.company_name,
    number: raw.company_number,
    status: raw.company_status,
    type: raw.type,
    incorporated: raw.date_of_creation,
    dissolved: raw.date_of_cessation ?? null,
    address: raw.registered_office_address,
    sic_codes: raw.sic_codes ?? [],
    accounts: {
      next_due: raw.accounts?.next_due ?? null,
      last_made_up_to: raw.accounts?.last_accounts?.made_up_to ?? null,
      overdue: raw.accounts?.overdue ?? false,
    },
    confirmation_statement: {
      next_due: raw.confirmation_statement?.next_due ?? null,
      overdue: raw.confirmation_statement?.overdue ?? false,
    },
    has_been_liquidated: raw.has_been_liquidated ?? false,
    has_charges: raw.has_charges ?? false,
    has_insolvency_history: raw.has_insolvency_history ?? false,
  };
}

async function fetchCHOfficers(number: string, apiKey: string) {
  try {
    const res = await fetchUpstream(`https://api.company-information.service.gov.uk/company/${number}/officers?items_per_page=20`, {
      headers: chAuth(apiKey),
    });
    const raw: any = await res.json();
    return (raw.items ?? []).map((o: any) => ({
      name: o.name,
      role: o.officer_role,
      appointed: o.appointed_on,
      resigned: o.resigned_on ?? null,
      nationality: o.nationality ?? null,
      country_of_residence: o.country_of_residence ?? null,
      date_of_birth: o.date_of_birth ? `${o.date_of_birth.year}-${String(o.date_of_birth.month).padStart(2, "0")}` : null,
    }));
  } catch {
    return [];
  }
}

async function fetchCHPSCs(number: string, apiKey: string) {
  try {
    const res = await fetchUpstream(`https://api.company-information.service.gov.uk/company/${number}/persons-with-significant-control?items_per_page=20`, {
      headers: chAuth(apiKey),
    });
    const raw: any = await res.json();
    return (raw.items ?? []).map((p: any) => ({
      name: p.name,
      kind: p.kind,
      nationality: p.nationality ?? null,
      country_of_residence: p.country_of_residence ?? null,
      notified_on: p.notified_on,
      ceased: p.ceased ?? false,
      natures_of_control: p.natures_of_control ?? [],
    }));
  } catch {
    return [];
  }
}

async function fetchCHCharges(number: string, apiKey: string) {
  try {
    const res = await fetchUpstream(`https://api.company-information.service.gov.uk/company/${number}/charges?items_per_page=10`, {
      headers: chAuth(apiKey),
    });
    const raw: any = await res.json();
    return (raw.items ?? []).slice(0, 10).map((ch: any) => ({
      status: ch.status,
      created: ch.created_on,
      delivered: ch.delivered_on,
      description: ch.particulars?.description ?? null,
      persons_entitled: (ch.persons_entitled ?? []).map((p: any) => p.name),
    }));
  } catch {
    return [];
  }
}

async function searchCH(query: string, apiKey: string) {
  const res = await fetchUpstream(`https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(query)}&items_per_page=20`, {
    headers: chAuth(apiKey),
  });
  const raw: any = await res.json();
  return {
    source: "UK Companies House",
    total: raw.total_results ?? 0,
    companies: (raw.items ?? []).map((co: any) => ({
      name: co.title,
      number: co.company_number,
      status: co.company_status,
      type: co.company_type,
      incorporated: co.date_of_creation ?? null,
      address: co.address_snippet ?? null,
    })),
  };
}

async function searchOpenCorporates(query: string, country: string) {
  try {
    // OpenCorporates API — free tier, 200 requests/month
    const url = `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(query)}&jurisdiction_code=${country}&per_page=20`;
    const res = await fetch(url, {
      headers: { "User-Agent": "DevDrops/1.0 (api.devdrops.run)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { source: "OpenCorporates", total: 0, companies: [], error: `HTTP ${res.status}` };

    const raw: any = await res.json();
    return {
      source: "OpenCorporates",
      total: raw.results?.total_count ?? 0,
      companies: (raw.results?.companies ?? []).map((c: any) => ({
        name: c.company?.name,
        number: c.company?.company_number,
        jurisdiction: c.company?.jurisdiction_code,
        status: c.company?.current_status,
        incorporated: c.company?.incorporation_date,
        company_type: c.company?.company_type,
      })),
    };
  } catch {
    return { source: "OpenCorporates", total: 0, companies: [], error: "Service unavailable" };
  }
}

async function enrichFromDomain(domain: string): Promise<Record<string, unknown>> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];

  try {
    const res = await fetch(`https://${cleanDomain}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DevDrops/1.0)" },
      signal: AbortSignal.timeout(10000),
    });

    const html = await res.text();

    // Extract meta tags
    const name = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<title[^>]*>([^<|–-]+)/i)?.[1]?.trim()
      ?? null;
    const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? null;
    const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? null;

    // LinkedIn, Twitter, GitHub links
    const linkedIn = html.match(/linkedin\.com\/company\/([a-zA-Z0-9\-_]+)/)?.[1] ?? null;
    const twitter = html.match(/twitter\.com\/([a-zA-Z0-9_]+)/)?.[1]
      ?? html.match(/x\.com\/([a-zA-Z0-9_]+)/)?.[1]
      ?? null;
    const github = html.match(/github\.com\/([a-zA-Z0-9\-_]+)/)?.[1] ?? null;

    return {
      domain: cleanDomain,
      name,
      description,
      logo: ogImage,
      social: {
        linkedin: linkedIn ? `https://linkedin.com/company/${linkedIn}` : null,
        twitter: twitter ? `https://x.com/${twitter}` : null,
        github: github ? `https://github.com/${github}` : null,
      },
      source: "Website meta tags",
      note: "Data extracted from public website. For verified UK company data, use /api/company/uk/:number",
    };
  } catch {
    return {
      domain: cleanDomain,
      error: "Could not fetch website",
      source: "Website meta tags",
    };
  }
}

export default company;
