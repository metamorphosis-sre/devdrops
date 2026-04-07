import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "domain";
const CACHE_TTL = 3600; // 1 hour

const domain = new Hono<{ Bindings: Env }>();

// GET /api/domain/lookup/:domain — full domain intelligence
domain.get("/lookup/:domain", async (c) => {
  const domainName = c.req.param("domain");
  const cacheKey = `lookup:${domainName}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const [rdap, dns, ssl] = await Promise.allSettled([
    fetchRDAP(domainName),
    fetchDNS(domainName),
    fetchSSL(domainName),
  ]);

  const data = {
    domain: domainName,
    rdap: rdap.status === "fulfilled" ? rdap.value : null,
    dns: dns.status === "fulfilled" ? dns.value : null,
    ssl: ssl.status === "fulfilled" ? ssl.value : null,
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/domain/dns/:domain — DNS records only
domain.get("/dns/:domain", async (c) => {
  const domainName = c.req.param("domain");
  const type = c.req.query("type") ?? "A";
  const cacheKey = `dns:${domainName}:${type}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const data = await fetchDNSType(domainName, type);

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/domain/whois/:domain — RDAP/WHOIS data
domain.get("/whois/:domain", async (c) => {
  const domainName = c.req.param("domain");
  const cacheKey = `rdap:${domainName}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const data = await fetchRDAP(domainName);

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

async function fetchRDAP(domainName: string) {
  try {
    const res = await fetchUpstream(`https://rdap.org/domain/${domainName}`);
    const raw: any = await res.json();
    return {
      name: raw.ldhName,
      status: raw.status,
      registered: raw.events?.find((e: any) => e.eventAction === "registration")?.eventDate,
      expires: raw.events?.find((e: any) => e.eventAction === "expiration")?.eventDate,
      updated: raw.events?.find((e: any) => e.eventAction === "last changed")?.eventDate,
      registrar: raw.entities?.find((e: any) => e.roles?.includes("registrar"))?.vcardArray?.[1]?.find((v: any) => v[0] === "fn")?.[3],
      nameservers: raw.nameservers?.map((ns: any) => ns.ldhName),
    };
  } catch {
    return null;
  }
}

async function fetchDNS(domainName: string) {
  const types = ["A", "AAAA", "MX", "NS", "TXT"];
  const results: Record<string, unknown[]> = {};

  await Promise.all(
    types.map(async (type) => {
      try {
        const data = await fetchDNSType(domainName, type);
        results[type] = data.records;
      } catch {
        results[type] = [];
      }
    })
  );

  return results;
}

async function fetchDNSType(domainName: string, type: string) {
  const res = await fetchUpstream(
    `https://dns.google/resolve?name=${domainName}&type=${type}`,
    { headers: { Accept: "application/dns-json" } }
  );
  const raw: any = await res.json();
  return {
    domain: domainName,
    type,
    records: raw.Answer?.map((a: any) => ({ name: a.name, type: a.type, ttl: a.TTL, data: a.data })) ?? [],
  };
}

async function fetchSSL(domainName: string) {
  try {
    const res = await fetchUpstream(`https://crt.sh/?q=${domainName}&output=json`);
    const raw: any[] = await res.json();
    const recent = raw.slice(0, 5);
    return recent.map((cert) => ({
      issuer: cert.issuer_name,
      common_name: cert.common_name,
      not_before: cert.not_before,
      not_after: cert.not_after,
      serial: cert.serial_number,
    }));
  } catch {
    return null;
  }
}

domain.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: ["/api/domain/lookup/example.com", "/api/domain/dns/example.com", "/api/domain/whois/example.com"],
}, 400));

export default domain;
