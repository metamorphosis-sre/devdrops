import { Hono } from "hono";
import type { Env } from "../types";

const PRODUCT = "ip";

const ip = new Hono<{ Bindings: Env }>();

// GET /api/ip/me — geolocation of the requesting agent (from Cloudflare headers)
ip.get("/me", async (c) => {
  const cf = (c.req.raw as any).cf;

  const data = {
    ip: c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown",
    country: cf?.country,
    country_name: cf?.country,
    region: cf?.region,
    region_code: cf?.regionCode,
    city: cf?.city,
    postal_code: cf?.postalCode,
    latitude: cf?.latitude,
    longitude: cf?.longitude,
    timezone: cf?.timezone,
    continent: cf?.continent,
    asn: cf?.asn,
    as_organization: cf?.asOrganization,
    colo: cf?.colo,
    http_protocol: cf?.httpProtocol,
    tls_version: cf?.tlsVersion,
    is_eu: cf?.isEUCountry === "1",
  };

  return c.json({ product: PRODUCT, data, timestamp: new Date().toISOString() });
});

// GET /api/ip/lookup/:ip — lookup a specific IP address (IPinfo.io — free tier, commercial use OK)
ip.get("/lookup/:ip", async (c) => {
  const ipAddr = c.req.param("ip");

  try {
    // IPinfo.io: free tier 50K lookups/month, commercial use allowed
    const res = await fetch(`https://ipinfo.io/${ipAddr}/json`, {
      headers: { "Accept": "application/json", "User-Agent": "DevDrops/1.0 (api.devdrops.run)" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return c.json({ error: "IP lookup failed", status: res.status }, res.status as any);
    }

    const raw: any = await res.json();

    if (raw.bogon) {
      return c.json({ error: "Reserved/private IP address", ip: ipAddr }, 400);
    }

    const [lat, lon] = (raw.loc ?? ",").split(",");

    const data = {
      ip: raw.ip ?? ipAddr,
      hostname: raw.hostname,
      country_code: raw.country,
      region: raw.region,
      city: raw.city,
      postal_code: raw.postal,
      latitude: lat ? parseFloat(lat) : null,
      longitude: lon ? parseFloat(lon) : null,
      timezone: raw.timezone,
      organization: raw.org,
    };

    return c.json({ product: PRODUCT, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "IP lookup service unavailable" }, 503);
  }
});

export default ip;
