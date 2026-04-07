import { Hono } from "hono";
import type { Env } from "../types";
import { getTiered, setTiered } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "asn";
const CACHE_TTL = 3600; // 1 hour

const asn = new Hono<{ Bindings: Env }>();

// GET /api/asn/ip/:ip — resolve IP to ASN, organisation, and network info
asn.get("/ip/:ip", async (c) => {
  const ip = c.req.param("ip");
  if (!isValidIP(ip)) return c.json({ error: "Invalid IP address" }, 400);

  const cacheKey = `ip:${ip}`;
  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  try {
    const res = await fetchUpstream(`https://api.bgpview.io/ip/${ip}`);
    if (!res.ok) return c.json({ error: `BGPView returned ${res.status}` }, 502);
    const raw: any = await res.json();
    if (raw.status !== "ok") return c.json({ error: "IP lookup failed" }, 502);

    const d = raw.data;
    const prefixes = d.prefixes ?? [];
    const primary = prefixes[0];

    const data = {
      ip,
      asn: primary?.asn?.asn ?? null,
      asn_name: primary?.asn?.name ?? null,
      asn_description: primary?.asn?.description ?? null,
      country_code: primary?.asn?.country_code ?? null,
      prefix: primary?.prefix ?? null,
      rir: primary?.asn?.rir_allocation?.rir_name ?? null,
      all_prefixes: prefixes.slice(0, 5).map((p: any) => ({
        prefix: p.prefix,
        asn: p.asn?.asn,
        name: p.asn?.name,
      })),
      ptr_record: d.ptr_record ?? null,
      source: "BGPView",
    };

    await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "ASN lookup service unavailable" }, 503);
  }
});

// GET /api/asn/lookup/:asn — get details for an ASN (e.g. 13335 for Cloudflare)
asn.get("/lookup/:asnNumber", async (c) => {
  const asnNumber = c.req.param("asnNumber").replace(/^AS/i, "");
  if (!/^\d+$/.test(asnNumber)) return c.json({ error: "Invalid ASN. Use numeric format (e.g. 13335) or AS13335" }, 400);

  const cacheKey = `asn:${asnNumber}`;
  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  try {
    const [asnRes, prefixRes] = await Promise.allSettled([
      fetchUpstream(`https://api.bgpview.io/asn/${asnNumber}`),
      fetchUpstream(`https://api.bgpview.io/asn/${asnNumber}/prefixes`),
    ]);

    if (asnRes.status === "rejected" || !asnRes.value.ok) {
      return c.json({ error: "ASN not found" }, 404);
    }

    const asnRaw: any = await asnRes.value.json();
    if (asnRaw.status !== "ok") return c.json({ error: "ASN not found" }, 404);

    const a = asnRaw.data;
    let prefixes: any[] = [];

    if (prefixRes.status === "fulfilled" && prefixRes.value.ok) {
      const prefixRaw: any = await prefixRes.value.json();
      prefixes = (prefixRaw.data?.ipv4_prefixes ?? []).slice(0, 10).map((p: any) => ({
        prefix: p.prefix,
        name: p.name,
        description: p.description,
        country_code: p.country_code,
      }));
    }

    const data = {
      asn: a.asn,
      name: a.name,
      description: a.description_short ?? a.description_full?.[0] ?? null,
      country_code: a.country_code,
      rir: a.rir_allocation?.rir_name ?? null,
      allocation_date: a.rir_allocation?.date_allocated ?? null,
      type: a.type ?? null,
      website: a.website ?? null,
      email_contacts: a.email_contacts?.slice(0, 3) ?? [],
      ipv4_prefixes_count: a.announced_prefixes?.ipv4 ?? null,
      ipv6_prefixes_count: a.announced_prefixes?.ipv6 ?? null,
      sample_prefixes: prefixes,
      source: "BGPView",
    };

    await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL * 24);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "ASN lookup service unavailable" }, 503);
  }
});

// GET /api/asn/peers/:asn — upstream and downstream peers for an ASN
asn.get("/peers/:asnNumber", async (c) => {
  const asnNumber = c.req.param("asnNumber").replace(/^AS/i, "");
  if (!/^\d+$/.test(asnNumber)) return c.json({ error: "Invalid ASN" }, 400);

  const cacheKey = `peers:${asnNumber}`;
  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  try {
    const res = await fetchUpstream(`https://api.bgpview.io/asn/${asnNumber}/peers`);
    if (!res.ok) return c.json({ error: "Peers lookup failed" }, 502);
    const raw: any = await res.json();
    if (raw.status !== "ok") return c.json({ error: "Peers not found" }, 404);

    const data = {
      asn: parseInt(asnNumber),
      ipv4_peers: (raw.data?.ipv4_peers ?? []).slice(0, 20).map((p: any) => ({
        asn: p.asn,
        name: p.name,
        description: p.description,
        country_code: p.country_code,
      })),
      ipv6_peers: (raw.data?.ipv6_peers ?? []).slice(0, 10).map((p: any) => ({
        asn: p.asn,
        name: p.name,
        country_code: p.country_code,
      })),
      source: "BGPView",
    };

    await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL * 6);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "Peers lookup service unavailable" }, 503);
  }
});

asn.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: [
    "/api/asn/ip/1.1.1.1",
    "/api/asn/ip/8.8.8.8",
    "/api/asn/lookup/13335",
    "/api/asn/lookup/AS15169",
    "/api/asn/peers/13335",
  ],
}, 400));

function isValidIP(ip: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;
  return ipv4.test(ip) || ipv6.test(ip);
}

export default asn;
