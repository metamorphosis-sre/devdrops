import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream, missingKeyResponse } from "../lib/fetch";

const PRODUCT = "shipping";
const CACHE_TTL = 1800; // 30 minutes

const shipping = new Hono<{ Bindings: Env }>();

// GET /api/shipping/estimate?from_zip=10001&to_zip=90210&weight_oz=16
shipping.get("/estimate", async (c) => {
  if (!c.env.EASYPOST_API_KEY) return c.json(missingKeyResponse("EASYPOST_API_KEY"), 503);

  const fromZip = c.req.query("from_zip");
  const toZip = c.req.query("to_zip");
  const weightOz = c.req.query("weight_oz");

  if (!fromZip || !toZip || !weightOz) {
    return c.json({ error: "Missing 'from_zip', 'to_zip', and 'weight_oz'" }, 400);
  }

  const cacheKey = `estimate:${fromZip}:${toZip}:${weightOz}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  // Create shipment via EasyPost to get rate estimates
  const shipmentRes = await fetch("https://api.easypost.com/v2/shipments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.env.EASYPOST_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      shipment: {
        from_address: { zip: fromZip, country: "US" },
        to_address: { zip: toZip, country: "US" },
        parcel: { weight: parseFloat(weightOz) },
      },
    }),
  });
  const raw: any = await shipmentRes.json();

  if (raw.error) {
    return c.json({ error: "EasyPost error", detail: raw.error.message }, 400);
  }

  const data = {
    from_zip: fromZip,
    to_zip: toZip,
    weight_oz: parseFloat(weightOz),
    rates: raw.rates?.sort((a: any, b: any) => parseFloat(a.rate) - parseFloat(b.rate)).map((r: any) => ({
      carrier: r.carrier,
      service: r.service,
      rate: r.rate,
      currency: r.currency,
      delivery_days: r.delivery_days,
      delivery_date: r.delivery_date,
    })),
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/shipping/track?carrier=USPS&tracking_code=123456
shipping.get("/track", async (c) => {
  if (!c.env.EASYPOST_API_KEY) return c.json(missingKeyResponse("EASYPOST_API_KEY"), 503);

  const carrier = c.req.query("carrier");
  const trackingCode = c.req.query("tracking_code");

  if (!carrier || !trackingCode) {
    return c.json({ error: "Missing 'carrier' and 'tracking_code'" }, 400);
  }

  const trackerRes = await fetch("https://api.easypost.com/v2/trackers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.env.EASYPOST_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tracker: { tracking_code: trackingCode, carrier },
    }),
  });
  const raw: any = await trackerRes.json();

  const data = {
    carrier: raw.carrier,
    tracking_code: raw.tracking_code,
    status: raw.status,
    est_delivery_date: raw.est_delivery_date,
    tracking_details: raw.tracking_details?.map((td: any) => ({
      datetime: td.datetime,
      message: td.message,
      status: td.status,
      city: td.tracking_location?.city,
      state: td.tracking_location?.state,
    })),
  };

  return c.json({ product: PRODUCT, data, timestamp: new Date().toISOString() });
});

export default shipping;
