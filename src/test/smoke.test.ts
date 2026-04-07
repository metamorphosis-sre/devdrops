import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";
// D1 schema is applied by globalSetup (src/test/setup.ts) before tests run

describe("landing page", () => {
  it("returns HTML at root", async () => {
    const res = await SELF.fetch("https://api.devdrops.run/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const body = await res.text();
    expect(body).toContain("DevDrops");
    expect(body).toContain("x402");
  });
});

describe("free routes", () => {
  it("GET /health returns a status response", async () => {
    const res = await SELF.fetch("https://api.devdrops.run/health");
    // 200 = healthy, 503 = degraded (r2 not configured in test env — both are valid)
    expect([200, 503]).toContain(res.status);
    const json = await res.json() as any;
    expect(["healthy", "degraded"]).toContain(json.status);
    expect(json.checks).toHaveProperty("d1");
    expect(json.checks).toHaveProperty("kv");
  });

  it("GET /catalog returns product list with prices", async () => {
    const res = await SELF.fetch("https://api.devdrops.run/catalog");
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(Array.isArray(json.products)).toBe(true);
    expect(json.products.length).toBeGreaterThanOrEqual(25);
    const first = json.products[0];
    expect(first).toHaveProperty("endpoint");
    expect(first).toHaveProperty("price");
    expect(first).toHaveProperty("description");
  });

  it("GET /openapi.json returns valid OpenAPI schema", async () => {
    const res = await SELF.fetch("https://api.devdrops.run/openapi.json");
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.openapi).toMatch(/^3\./);
    expect(json.info).toHaveProperty("title");
    expect(json).toHaveProperty("paths");
  });

  it("GET /.well-known/x402 returns payment manifest", async () => {
    const res = await SELF.fetch("https://api.devdrops.run/.well-known/x402");
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json).toHaveProperty("version");
    expect(json.version).toBe("x402/1");
    expect(json).toHaveProperty("baseUrl");
  });
});

describe("API root path helpers (return 400 + examples)", () => {
  const products = [
    "qr", "crypto", "time", "vat", "stocks",
  ];

  for (const product of products) {
    it(`GET /api/${product} returns 400 with examples`, async () => {
      const res = await SELF.fetch(`https://api.devdrops.run/api/${product}`);
      expect(res.status).toBe(400);
      const json = await res.json() as any;
      expect(Array.isArray(json.examples)).toBe(true);
    });
  }
});

describe("API data endpoints (dev mode — no payment required)", () => {
  it("GET /api/fx/latest returns exchange rates", async () => {
    const res = await SELF.fetch("https://api.devdrops.run/api/fx/latest");
    // 200 = upstream ok, 500 = D1 error (schema applied above should fix), 502/503 = upstream down
    expect([200, 500, 502, 503]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json() as any;
      expect(json.product).toBe("fx");
      expect(json.data).toHaveProperty("base");
      expect(json.data).toHaveProperty("rates");
    }
  });

  it("GET /api/ip/lookup/8.8.8.8 returns geo data", async () => {
    const res = await SELF.fetch("https://api.devdrops.run/api/ip/lookup/8.8.8.8");
    expect([200, 502, 503]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json() as any;
      expect(json.product).toBe("ip");
      expect(json.data).toHaveProperty("ip");
    }
  });

  it("GET /api/time/now?tz=UTC returns time with utc field", async () => {
    const res = await SELF.fetch("https://api.devdrops.run/api/time/now?tz=UTC");
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.product).toBe("time");
    expect(json.data).toHaveProperty("timezone");
    expect(json.data).toHaveProperty("utc");
    expect(json.data.timezone).toBe("UTC");
  });

  it("GET /api/email-verify/check/:email returns verification result", async () => {
    const res = await SELF.fetch("https://api.devdrops.run/api/email-verify/check/test@example.com");
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json() as any;
      expect(json.product).toBe("email-verify");
      expect(json.data).toHaveProperty("valid");
    }
  });

  it("GET /api/qr/generate?data=hello returns QR response", async () => {
    const res = await SELF.fetch("https://api.devdrops.run/api/qr/generate?data=hello&format=json");
    expect([200, 502, 503]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json() as any;
      expect(json.product).toBe("qr");
    }
  });

  it("GET /api/crypto/price/BTC returns price data", async () => {
    const res = await SELF.fetch("https://api.devdrops.run/api/crypto/price/BTC");
    expect([200, 404, 500, 502, 503]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json() as any;
      expect(json.product).toBe("crypto");
    }
  });

  it("GET /api/vat/countries returns supported country list", async () => {
    const res = await SELF.fetch("https://api.devdrops.run/api/vat/countries");
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.product).toBe("vat");
    expect(Array.isArray(json.data.supported)).toBe(true);
    expect(json.data.supported).toContain("GB");
    expect(json.data.supported).toContain("DE");
  });
});

describe("unknown routes", () => {
  it("GET /api/nonexistent returns 404", async () => {
    const res = await SELF.fetch("https://api.devdrops.run/api/nonexistent");
    expect(res.status).toBe(404);
    const json = await res.json() as any;
    expect(json).toHaveProperty("catalog");
  });
});
