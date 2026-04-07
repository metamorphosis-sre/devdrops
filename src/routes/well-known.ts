import { Hono } from "hono";
import type { Env } from "../types";
import { pricingMap } from "../middleware/payment";

const wellKnown = new Hono<{ Bindings: Env }>();

// GET /.well-known/x402
// Machine-readable service manifest for AI agent discovery.
// Follows de facto x402 ecosystem conventions (not yet formally standardised).
wellKnown.get("/x402", (c) => {
  const baseUrl = "https://api.devdrops.run";

  // Build endpoint list from the live pricing map
  const endpoints = Object.entries(pricingMap).map(([route, config]) => {
    const [method, path] = route.split(" ");
    return {
      path: path.replace("/*", ""),
      methods: [method],
      price: config.price.replace("$", ""),
      currency: "USDC",
      description: config.description,
    };
  });

  const manifest = {
    version: "x402/1",
    name: "DevDrops",
    description:
      "35 pay-per-query data APIs for AI agents — prediction markets, property intelligence, " +
      "sports odds, regulatory filings, FX rates, crypto prices, stocks, weather, IP geolocation, " +
      "sanctions screening, VAT verification, company enrichment, ASN/BGP, World Bank economics, " +
      "AI image generation, LLM inference, academic papers, document summarisation, and more. " +
      "No API keys, no accounts, no subscriptions. Pay USDC per request via x402 on Base mainnet.",
    baseUrl,
    wallet: c.env.PAY_TO_ADDRESS,
    pricing: {
      currency: "USDC",
      network: "base",
      network_id: "eip155:8453",
      min: "0.001",
      max: "0.10",
    },
    endpoints,
    links: {
      catalog: `${baseUrl}/catalog`,
      openapi: `${baseUrl}/openapi.json`,
      health: `${baseUrl}/health`,
      landing: "https://devdrops.run",
    },
    tags: [
      "prediction-markets", "property", "finance", "regulatory", "weather",
      "fx", "geolocation", "ai", "research", "crypto", "stocks", "sanctions",
      "compliance", "vat", "company-enrichment", "asn", "bgp", "economics",
      "image-generation", "llm", "utilities", "x402", "micropayments", "base-mainnet",
    ],
  };

  return c.json(manifest, 200, {
    "Cache-Control": "public, max-age=3600",
  });
});

// GET /.well-known/mcp.json — MCP server discovery manifest
wellKnown.get("/mcp.json", (c) => {
  return c.json({
    schema_version: "v1",
    name_for_human: "DevDrops Property",
    name_for_model: "devdrops_property",
    description_for_human: "UK property price lookups, company charges, and House Price Index via MCP.",
    description_for_model: "Query UK property transaction prices by postcode, look up property charges registered against a company, and retrieve the UK House Price Index by region. All data is sourced from HM Land Registry and Companies House. Prices are paid in USDC via x402.",
    auth: { type: "none" },
    payment: {
      type: "x402",
      network: "base",
      currency: "USDC",
      price_per_call: "0.01",
      facilitator: "https://api.cdp.coinbase.com/platform/v2/x402",
    },
    api: {
      type: "mcp",
      url: "https://api.devdrops.run/api/property/mcp",
      transport: "streamable-http",
      protocol_version: "2024-11-05",
    },
    tools: [
      {
        name: "get_uk_property_prices",
        description: "Recent UK property sale prices by postcode from HM Land Registry.",
      },
      {
        name: "get_uk_company_property_charges",
        description: "Property charges (mortgages) registered against a UK company number.",
      },
      {
        name: "get_uk_house_price_index",
        description: "UK House Price Index — average prices and annual/monthly changes by region.",
      },
    ],
  }, 200, { "Cache-Control": "public, max-age=86400" });
});

// GET /.well-known/llms.txt — AI assistant catalog (llms.txt standard)
wellKnown.get("/llms.txt", (c) => {
  const text = `# DevDrops
> 35 pay-per-query data APIs for AI agents. No accounts, no API keys, no subscriptions.
> Pay USDC per request via x402 micropayments on Base mainnet.
> API base: https://api.devdrops.run
> Catalog: https://api.devdrops.run/catalog
> OpenAPI: https://api.devdrops.run/openapi.json
> x402 manifest: https://api.devdrops.run/.well-known/x402

## How to use
All endpoints return HTTP 402 with payment details. Use @x402/fetch (JS) or x402-requests (Python) to pay automatically.
Minimum price: $0.001 USDC. Maximum: $0.10 USDC. Network: Base mainnet (eip155:8453).

## Endpoints by category

### Property & Real Estate ($0.01/query)
- GET /api/property/* — UK property prices, ownership, House Price Index
- GET /api/property/mcp — MCP server for property intelligence tools

### Financial Markets ($0.001–$0.05/query)
- GET /api/fx/* — Currency exchange rates, 33 major currencies (ECB data)
- GET /api/crypto/* — Live crypto prices, market cap, exchange data (2000+ tokens)
- GET /api/stocks/* — Stock quotes, history, movers (10,000+ tickers)
- GET /api/predictions/* — Prediction market odds (Polymarket + Manifold)
- GET /api/odds/* — Sports betting odds, cross-bookmaker comparison
- GET /api/calendar/* — Financial events calendar (FOMC, earnings, IPOs)
- GET /api/signals/* — Cross-market correlation signals (AI-powered, $0.05)

### Compliance & Business Intelligence ($0.01–$0.05/query)
- GET /api/sanctions/* — Sanctions screening, OFAC/UN/UK HMT fuzzy matching ($0.05)
- GET /api/vat/* — EU and UK VAT number verification
- GET /api/company/* — UK company enrichment, officers, PSCs, charges
- GET /api/regulatory/* — Regulatory change feeds, Companies House, SEC, FCA
- GET /api/filings/* — Company filings, beneficial ownership
- GET /api/tenders/* — Government tenders, UK + US federal procurement

### Network & Infrastructure ($0.005/query)
- GET /api/asn/* — IP to ASN lookup, BGP peer relationships
- GET /api/ip/* — IP geolocation, country, ISP, proxy detection
- GET /api/domain/* — WHOIS, DNS records, SSL certificates
- GET /api/email-verify/* — Email validation, MX records, disposable detection

### Data & Research ($0.001–$0.10/query)
- GET /api/economy/* — World Bank economic indicators, 200+ countries
- GET /api/papers/* — Academic papers, abstracts, citations (OpenAlex + Semantic Scholar)
- GET /api/history/* — Historical events, Wikipedia "on this day"
- GET /api/food/* — Nutrition data, 3M+ products (Open Food Facts)
- GET /api/weather/* — Weather, forecasts, alerts
- GET /api/location/* — UK address intelligence, flood risk, crime, schools
- GET /api/extract/* — URL content extraction, clean text from any webpage ($0.005)
- GET /api/research/* — AI research brief generator ($0.10)
- GET /api/sentiment/* — AI news sentiment analysis ($0.02)
- GET /api/documents/* — AI document summarisation ($0.10)

### AI & Utilities ($0.001–$0.02/query)
- POST /api/image/generate — AI image generation (Flux, SDXL) ($0.02)
- POST /api/inference/complete — LLM completion (Llama 3.1, Mistral) ($0.005)
- POST /api/inference/chat — LLM multi-turn chat ($0.005)
- GET /api/utils/* — Hash, IBAN validation, encode/decode, UUID ($0.001)
- GET /api/qr/* — QR code generation (SVG, PNG, base64) ($0.001)
- GET /api/time/* — Timezone, public holidays, business day checks ($0.001)
- POST /api/translate/* — Text translation, 70+ languages ($0.005)
`;

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
});

export default wellKnown;
