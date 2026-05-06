/**
 * Live smoke tests — call the deployed API at https://api.devdrops.run
 *
 * These run against the real production endpoint. They are intentionally
 * lenient (never assert on live upstream data) and only check structural
 * invariants: status codes, JSON shapes, required fields.
 *
 * Free-tier endpoints (fx, crypto, ip, time, weather, qr, history, utils)
 * return 200 for the first 5 requests/day from this IP. Payment-gated
 * endpoints return 402. Both are valid and tested here.
 */

import { describe, it, expect } from "vitest";

const BASE = "https://api.devdrops.run";

async function get(path: string) {
  return fetch(`${BASE}${path}`);
}

describe("landing + free routes", () => {
  it("GET / returns DevDrops HTML", async () => {
    const res = await get("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const body = await res.text();
    expect(body).toContain("DevDrops");
  });

  it("GET /health returns healthy status", async () => {
    const res = await get("/health");
    expect([200, 503]).toContain(res.status);
    const json = (await res.json()) as any;
    expect(["healthy", "degraded"]).toContain(json.status);
    expect(json.checks).toHaveProperty("d1");
    expect(json.checks).toHaveProperty("kv");
  });

  it("GET /catalog returns product list", async () => {
    const res = await get("/catalog");
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(Array.isArray(json.products)).toBe(true);
    expect(json.product_count).toBe(43);
    expect(json.products.length).toBe(43);
    const first = json.products[0];
    expect(first).toHaveProperty("endpoint");
    expect(first).toHaveProperty("price");
  });

  it("GET /openapi.json returns valid OpenAPI schema", async () => {
    const res = await get("/openapi.json");
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.openapi).toMatch(/^3\./);
    expect(json).toHaveProperty("paths");
  });

  it("GET /.well-known/x402 returns payment manifest", async () => {
    const res = await get("/.well-known/x402");
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.version).toBe("x402/1");
    expect(json).toHaveProperty("baseUrl");
    expect(json).toHaveProperty("endpoints");
  });
});

describe("free-tier endpoints (5 queries/day/IP — expect 200)", () => {
  it("GET /api/fx/latest returns exchange rates or 402 when quota exceeded", async () => {
    const res = await get("/api/fx/latest");
    // 200 = free tier quota available; 402 = quota exceeded for this IP today
    expect([200, 402]).toContain(res.status);
    if (res.status === 200) {
      const json = (await res.json()) as any;
      expect(json.product).toBe("fx");
      expect(json.data).toHaveProperty("rates");
    }
  });

  it("GET /api/time/now?tz=UTC returns time data", async () => {
    const res = await get("/api/time/now?tz=UTC");
    expect([200, 402]).toContain(res.status);
    if (res.status === 200) {
      const json = (await res.json()) as any;
      expect(json.product).toBe("time");
      expect(json.data).toHaveProperty("utc");
    }
  });

  it("GET /api/ip/lookup/8.8.8.8 returns geo data", async () => {
    const res = await get("/api/ip/lookup/8.8.8.8");
    expect([200, 402]).toContain(res.status);
    if (res.status === 200) {
      const json = (await res.json()) as any;
      expect(json.product).toBe("ip");
      expect(json.data).toHaveProperty("ip");
    }
  });

  it("GET /api/qr/generate?data=hello returns QR code", async () => {
    const res = await get("/api/qr/generate?data=hello&format=json");
    expect([200, 402]).toContain(res.status);
    if (res.status === 200) {
      const json = (await res.json()) as any;
      expect(json.product).toBe("qr");
    }
  });
});

describe("payment-gated endpoints (always 402 without payment)", () => {
  it("GET /api/property/uk/prices?postcode=SW1A1AA returns 402", async () => {
    const res = await get("/api/property/uk/prices?postcode=SW1A1AA");
    expect(res.status).toBe(402);
  });

  it("GET /api/sanctions/check?name=test returns 402", async () => {
    const res = await get("/api/sanctions/check?name=test");
    expect(res.status).toBe(402);
  });

  it("GET /api/stocks/quote/AAPL returns 402", async () => {
    const res = await get("/api/stocks/quote/AAPL");
    expect(res.status).toBe(402);
  });

  it("GET /api/predictions/markets returns 402", async () => {
    const res = await get("/api/predictions/markets");
    expect(res.status).toBe(402);
  });
});

describe("utility endpoints (always free, pure computation)", () => {
  it("GET /api/vat/countries returns country list", async () => {
    const res = await get("/api/vat/countries");
    // vat/countries is a static endpoint — check both 200 and 402
    expect([200, 402]).toContain(res.status);
  });

  it("GET /api/email-verify/check/test@example.com returns result", async () => {
    const res = await get("/api/email-verify/check/test@example.com");
    expect([200, 402]).toContain(res.status);
  });
});

describe("unknown routes", () => {
  it("GET /api/nonexistent returns 404 with catalog link", async () => {
    const res = await get("/api/nonexistent");
    expect(res.status).toBe(404);
    const json = (await res.json()) as any;
    expect(json).toHaveProperty("catalog");
  });
});
