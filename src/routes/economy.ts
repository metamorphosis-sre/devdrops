import { Hono } from "hono";
import type { Env } from "../types";
import { getTiered, setTiered } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "economy";
const CACHE_TTL = 86400; // 24 hours (World Bank data updates monthly)
const WB_BASE = "https://api.worldbank.org/v2";

// Common indicator codes for easy reference
const COMMON_INDICATORS: Record<string, string> = {
  gdp: "NY.GDP.MKTP.CD",
  gdp_per_capita: "NY.GDP.PCAP.CD",
  gdp_growth: "NY.GDP.MKTP.KD.ZG",
  inflation: "FP.CPI.TOTL.ZG",
  unemployment: "SL.UEM.TOTL.ZS",
  population: "SP.POP.TOTL",
  life_expectancy: "SP.DYN.LE00.IN",
  co2_emissions: "EN.ATM.CO2E.PC",
  trade_percent_gdp: "NE.TRD.GNFS.ZS",
  gini: "SI.POV.GINI",
  literacy_rate: "SE.ADT.LITR.ZS",
  internet_users: "IT.NET.USER.ZS",
};

const economy = new Hono<{ Bindings: Env }>();

// GET /api/economy/indicator?country=US&indicator=gdp&years=10
// Supports both short names (gdp, inflation) and full WB codes (NY.GDP.MKTP.CD)
economy.get("/indicator", async (c) => {
  const country = (c.req.query("country") ?? "US").toUpperCase();
  const indicatorParam = c.req.query("indicator") ?? "gdp";
  const years = Math.min(parseInt(c.req.query("years") ?? "10"), 50);

  const indicatorCode = COMMON_INDICATORS[indicatorParam.toLowerCase()] ?? indicatorParam;
  const cacheKey = `indicator:${country}:${indicatorCode}:${years}`;

  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  try {
    const url = `${WB_BASE}/country/${country}/indicator/${indicatorCode}?format=json&mrv=${years}&per_page=${years}`;
    const res = await fetchUpstream(url);
    if (!res.ok) return c.json({ error: `World Bank returned ${res.status}` }, 502);

    const raw: any[] = await res.json();
    if (!Array.isArray(raw) || raw.length < 2) {
      return c.json({ error: `No data found for country '${country}' and indicator '${indicatorParam}'` }, 404);
    }

    const meta = raw[0];
    const values = raw[1];

    if (!values || values.length === 0) {
      return c.json({ error: `No data found. Use /api/economy/indicators for available codes.` }, 404);
    }

    const indicator = values[0]?.indicator;

    const data = {
      country: values[0]?.country?.value ?? country,
      country_code: country,
      indicator_code: indicatorCode,
      indicator_name: indicator?.value ?? indicatorParam,
      unit: detectUnit(indicatorCode),
      total_pages: meta?.pages ?? 1,
      data_points: values
        .filter((v: any) => v.value !== null)
        .map((v: any) => ({
          year: parseInt(v.date),
          value: v.value,
        }))
        .sort((a: any, b: any) => b.year - a.year),
      source: "World Bank Open Data",
      license: "CC BY 4.0",
    };

    await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "World Bank service unavailable" }, 503);
  }
});

// GET /api/economy/compare?countries=US,GB,DE&indicator=gdp_per_capita
economy.get("/compare", async (c) => {
  const countriesParam = c.req.query("countries") ?? "US,GB,DE";
  const indicatorParam = c.req.query("indicator") ?? "gdp_per_capita";
  const years = Math.min(parseInt(c.req.query("years") ?? "5"), 20);

  const countries = countriesParam.split(",").map((s) => s.trim().toUpperCase()).slice(0, 5);
  const indicatorCode = COMMON_INDICATORS[indicatorParam.toLowerCase()] ?? indicatorParam;
  const cacheKey = `compare:${countries.join(",")}:${indicatorCode}:${years}`;

  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  try {
    const countryStr = countries.join(";");
    const url = `${WB_BASE}/country/${countryStr}/indicator/${indicatorCode}?format=json&mrv=${years}&per_page=${countries.length * years}`;
    const res = await fetchUpstream(url);
    if (!res.ok) return c.json({ error: `World Bank returned ${res.status}` }, 502);

    const raw: any[] = await res.json();
    if (!Array.isArray(raw) || raw.length < 2 || !raw[1]) {
      return c.json({ error: "No data found for the requested countries/indicator" }, 404);
    }

    const values = raw[1];
    const indicatorName = values[0]?.indicator?.value ?? indicatorParam;

    // Group by country
    const byCountry: Record<string, { country: string; values: { year: number; value: number | null }[] }> = {};
    for (const v of values) {
      const code = v.country?.id ?? v.countryiso3code;
      if (!byCountry[code]) {
        byCountry[code] = { country: v.country?.value ?? code, values: [] };
      }
      byCountry[code].values.push({ year: parseInt(v.date), value: v.value });
    }

    // Sort each country's values by year desc
    for (const code of Object.keys(byCountry)) {
      byCountry[code].values.sort((a, b) => b.year - a.year);
    }

    const data = {
      indicator_code: indicatorCode,
      indicator_name: indicatorName,
      unit: detectUnit(indicatorCode),
      countries: byCountry,
      source: "World Bank Open Data",
      license: "CC BY 4.0",
    };

    await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "World Bank service unavailable" }, 503);
  }
});

// GET /api/economy/indicators — list common indicator shortcuts
economy.get("/indicators", (c) => c.json({
  product: PRODUCT,
  data: {
    shortcuts: COMMON_INDICATORS,
    note: "You can also use any World Bank indicator code directly (e.g. NY.GDP.MKTP.CD). Full list: https://data.worldbank.org/indicator",
    common_country_codes: {
      US: "United States", GB: "United Kingdom", DE: "Germany", FR: "France",
      JP: "Japan", CN: "China", IN: "India", BR: "Brazil", AU: "Australia", CA: "Canada",
    },
  },
  timestamp: new Date().toISOString(),
}));

economy.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: [
    "/api/economy/indicator?country=US&indicator=gdp",
    "/api/economy/indicator?country=GB&indicator=inflation&years=20",
    "/api/economy/indicator?country=CN&indicator=NY.GDP.MKTP.CD",
    "/api/economy/compare?countries=US,GB,DE&indicator=gdp_per_capita",
    "/api/economy/indicators",
  ],
}, 400));

function detectUnit(code: string): string {
  if (code.includes("ZS") || code.includes("ZG") || code.includes("ZP")) return "percent";
  if (code.includes("CD")) return "USD (current)";
  if (code.includes("KD")) return "USD (constant 2015)";
  if (code.includes("PC")) return "per capita";
  if (code === "SP.POP.TOTL") return "persons";
  return "value";
}

export default economy;
