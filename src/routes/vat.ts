import { Hono } from "hono";
import type { Env } from "../types";
import { getTiered, setTiered } from "../lib/cache";

const PRODUCT = "vat";
const CACHE_TTL = 86400; // 24 hours (VAT registrations change rarely)

const vat = new Hono<{ Bindings: Env }>();

// GET /api/vat/check/:number — verify a VAT number and get registered business details
// Supports: EU (all member states), UK
vat.get("/check/:number", async (c) => {
  const raw = c.req.param("number").toUpperCase().replace(/\s+/g, "");
  const cacheKey = `check:${raw}`;

  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  // Detect country prefix
  const countryCode = raw.match(/^[A-Z]{2}/)?.[0];
  const numberPart = raw.replace(/^[A-Z]{2}/, "");

  if (!countryCode || !numberPart) {
    return c.json({ error: "VAT number must include country code prefix (e.g. GB123456789, DE123456789)" }, 400);
  }

  let data: Record<string, unknown>;

  if (countryCode === "GB") {
    data = await checkUKVAT(numberPart);
  } else {
    data = await checkEUVAT(countryCode, numberPart);
  }

  if (!data.valid && !data.error) {
    return c.json({ product: PRODUCT, data }, 200);
  }

  if (data.error) {
    return c.json({ product: PRODUCT, data });
  }

  await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/vat/countries — list of supported country codes
vat.get("/countries", (c) => c.json({
  product: PRODUCT,
  data: {
    supported: [
      "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR",
      "GB", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL",
      "PL", "PT", "RO", "SE", "SI", "SK", "XI",
    ],
    note: "GB = UK (post-Brexit). XI = Northern Ireland. All EU member states supported via EU VIES.",
  },
  timestamp: new Date().toISOString(),
}));

vat.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: [
    "/api/vat/check/GB123456789",
    "/api/vat/check/DE123456789",
    "/api/vat/check/FR12345678901",
    "/api/vat/countries",
  ],
}, 400));

async function checkEUVAT(countryCode: string, vatNumber: string): Promise<Record<string, unknown>> {
  try {
    // EU VIES REST API (European Commission — free, no key)
    const res = await fetch("https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ countryCode, vatNumber }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return { valid: false, error: `VIES returned ${res.status}`, status: 502 };
    }

    const raw: any = await res.json();

    return {
      vat_number: `${countryCode}${vatNumber}`,
      country_code: countryCode,
      valid: raw.valid ?? false,
      business_name: raw.name ?? null,
      address: raw.address ?? null,
      request_date: raw.requestDate ?? null,
      source: "EU VIES",
    };
  } catch (e) {
    return { valid: false, error: "EU VIES service unavailable", detail: String(e), status: 503 };
  }
}

async function checkUKVAT(vatNumber: string): Promise<Record<string, unknown>> {
  try {
    // UK HMRC VAT Number Validation API — free, no OAuth required for basic check
    const res = await fetch(`https://api.service.hmrc.gov.uk/organisations/vat/check-vat-number/lookup/${vatNumber}`, {
      headers: { "Accept": "application/vnd.hmrc.1.0+json" },
      signal: AbortSignal.timeout(15000),
    });

    if (res.status === 404) {
      return { vat_number: `GB${vatNumber}`, country_code: "GB", valid: false, source: "UK HMRC" };
    }

    if (!res.ok) {
      return { valid: false, error: `HMRC returned ${res.status}`, status: 502 };
    }

    const raw: any = await res.json();
    const target = raw.target;

    return {
      vat_number: `GB${vatNumber}`,
      country_code: "GB",
      valid: true,
      business_name: target?.name ?? null,
      address: target?.address
        ? [target.address.line1, target.address.line2, target.address.line3, target.address.postCode]
            .filter(Boolean).join(", ")
        : null,
      source: "UK HMRC",
    };
  } catch (e) {
    return { valid: false, error: "UK HMRC service unavailable", detail: String(e), status: 503 };
  }
}

export default vat;
