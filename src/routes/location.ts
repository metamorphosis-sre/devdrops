import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "location";
const CACHE_TTL = 86400; // 24 hours

const location = new Hono<{ Bindings: Env }>();

// GET /api/location/uk/report?postcode=SW1A+1AA — comprehensive UK location intelligence
location.get("/uk/report", async (c) => {
  const postcode = c.req.query("postcode");
  const lat = c.req.query("lat");
  const lng = c.req.query("lng");

  if (!postcode && (!lat || !lng)) return c.json({ error: "Provide 'postcode' or 'lat'+'lng'" }, 400);

  const key = postcode ?? `${lat},${lng}`;
  const cacheKey = `uk:report:${key}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  // Resolve postcode to lat/lng if needed
  let latitude = lat ? parseFloat(lat) : 0;
  let longitude = lng ? parseFloat(lng) : 0;

  if (postcode) {
    try {
      const pcRes = await fetchUpstream(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
      const pcData: any = await pcRes.json();
      if (pcData.result) {
        latitude = pcData.result.latitude;
        longitude = pcData.result.longitude;
      }
    } catch {}
  }

  const [flood, crime, broadband] = await Promise.allSettled([
    fetchFloodRisk(latitude, longitude),
    fetchCrime(latitude, longitude),
    fetchBroadband(postcode),
  ]);

  const data = {
    location: { postcode, latitude, longitude },
    flood_risk: flood.status === "fulfilled" ? flood.value : null,
    crime: crime.status === "fulfilled" ? crime.value : null,
    broadband: broadband.status === "fulfilled" ? broadband.value : null,
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/location/uk/flood?lat=51.5&lng=-0.1
location.get("/uk/flood", async (c) => {
  const lat = c.req.query("lat");
  const lng = c.req.query("lng");
  if (!lat || !lng) return c.json({ error: "Missing 'lat' and 'lng'" }, 400);

  const data = await fetchFloodRisk(parseFloat(lat), parseFloat(lng));
  return c.json({ product: PRODUCT, data, timestamp: new Date().toISOString() });
});

// GET /api/location/uk/crime?lat=51.5&lng=-0.1
location.get("/uk/crime", async (c) => {
  const lat = c.req.query("lat");
  const lng = c.req.query("lng");
  if (!lat || !lng) return c.json({ error: "Missing 'lat' and 'lng'" }, 400);

  const data = await fetchCrime(parseFloat(lat), parseFloat(lng));
  return c.json({ product: PRODUCT, data, timestamp: new Date().toISOString() });
});

async function fetchFloodRisk(lat: number, lng: number) {
  try {
    const url = `https://environment.data.gov.uk/flood-monitoring/id/stations?lat=${lat}&long=${lng}&dist=3`;
    const res = await fetchUpstream(url);
    const raw: any = await res.json();

    return {
      source: "Environment Agency",
      nearby_stations: raw.items?.slice(0, 5).map((s: any) => ({
        name: s.label,
        river: s.riverName,
        catchment: s.catchmentName,
        status: s.status?.label,
        distance_km: s.dist,
      })),
    };
  } catch {
    return { source: "Environment Agency", error: "Service unavailable" };
  }
}

async function fetchCrime(lat: number, lng: number) {
  try {
    // Police.uk API — street-level crimes
    const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${lat}&lng=${lng}`;
    const res = await fetchUpstream(url);
    const raw: any[] = await res.json();

    // Aggregate by category
    const categories: Record<string, number> = {};
    for (const crime of raw) {
      const cat = crime.category ?? "unknown";
      categories[cat] = (categories[cat] ?? 0) + 1;
    }

    return {
      source: "Police.uk",
      total_crimes: raw.length,
      month: raw[0]?.month,
      by_category: Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => ({ category, count })),
    };
  } catch {
    return { source: "Police.uk", error: "Service unavailable" };
  }
}

async function fetchBroadband(postcode?: string | null) {
  if (!postcode) return null;
  try {
    // Ofcom Connected Nations API — broadband coverage
    const url = `https://api-proxy.ofcom.org.uk/mobile/coverage?postcode=${encodeURIComponent(postcode)}`;
    const res = await fetchUpstream(url);
    const data = await res.json();
    return { source: "Ofcom", coverage: data };
  } catch {
    return { source: "Ofcom", error: "Service unavailable" };
  }
}

location.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: ["/api/location/uk/report?postcode=SW1A+1AA", "/api/location/uk/flood?lat=51.5&lng=-0.1", "/api/location/uk/crime?lat=51.5&lng=-0.1"],
}, 400));

export default location;
