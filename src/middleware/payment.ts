import type { PricingMap } from "../types";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

// Central pricing map for all DevDrops products.
// Add new product routes here — the x402 middleware reads this to set per-route prices.
// Prices are in USD (dollar-prefixed strings required by x402).
export const pricingMap: PricingMap = {
  // Tier 1: Domain Expertise
  "GET /api/property/*": { price: "$0.01", description: "Global property intelligence — planning, prices, zoning" },
  "GET /api/property/mcp/*": { price: "$0.01", description: "Property intelligence via MCP tools" },
  "POST /api/property/mcp": { price: "$0.01", description: "Property intelligence via MCP tools (JSON-RPC)" },

  // Tier 2: Data Aggregation
  "GET /api/predictions/*": { price: "$0.005", description: "Cross-platform prediction market odds" },
  "GET /api/odds/*": { price: "$0.005", description: "Cross-bookmaker sports betting odds" },
  "GET /api/regulatory/*": { price: "$0.01", description: "Regulatory change feeds — Companies House, SEC, FCA" },
  "GET /api/calendar/*": { price: "$0.005", description: "Financial events calendar — FOMC, earnings, IPOs" },
  "GET /api/filings/*": { price: "$0.01", description: "Company filings and beneficial ownership" },
  "GET /api/domain/*": { price: "$0.005", description: "WHOIS, DNS, SSL, tech stack detection" },
  "GET /api/weather/*": { price: "$0.001", description: "Current conditions, forecasts, severe weather alerts" },
  "GET /api/fx/*": { price: "$0.001", description: "Currency exchange rates — 33 major currencies" },
  "GET /api/ip/*": { price: "$0.001", description: "IP geolocation — country, city, ISP, proxy detection" },
  "GET /api/history/*": { price: "$0.001", description: "Historical events and 'on this day' data" },
  "GET /api/papers/*": { price: "$0.005", description: "Academic paper search — abstracts, citations, DOIs" },
  "GET /api/food/*": { price: "$0.005", description: "Nutrition data — calories, allergens, ingredients" },
  "GET /api/tenders/*": { price: "$0.01", description: "Public procurement and government tender notices" },

  // Tier 3: AI-Enhanced (higher prices to cover Claude API costs)
  "GET /api/sentiment/*": { price: "$0.02", description: "AI-powered news sentiment analysis" },
  "POST /api/sentiment/*": { price: "$0.02", description: "AI-powered news sentiment analysis" },
  "GET /api/signals/*": { price: "$0.05", description: "Cross-market correlation signals" },
  "POST /api/documents/*": { price: "$0.10", description: "Contract and document summarisation" },
  "GET /api/location/*": { price: "$0.02", description: "Address intelligence — flood, crime, schools, transport" },
  "GET /api/research/*": { price: "$0.10", description: "AI research brief generator" },
  "POST /api/research/*": { price: "$0.10", description: "AI research brief generator" },

  // Expansion products
  "POST /api/translate/*": { price: "$0.005", description: "Text translation — 70+ languages" },
  "GET /api/email-verify/*": { price: "$0.005", description: "Email address verification" },

  // New utility products
  "GET /api/qr/*": { price: "$0.001", description: "QR code generator — SVG, PNG, or base64 JSON" },
  "GET /api/crypto/*": { price: "$0.001", description: "Crypto token prices and market data via CoinCap" },
  "GET /api/time/*": { price: "$0.001", description: "Timezone conversion, public holidays, business day checks" },

  // New intelligence products
  "GET /api/vat/*": { price: "$0.01", description: "EU and UK VAT number verification via VIES and HMRC" },
  "GET /api/stocks/*": { price: "$0.005", description: "Live stock quotes, history, movers — 10,000+ tickers" },
  "GET /api/extract/*": { price: "$0.005", description: "URL content extraction — clean text, metadata, links" },
  "POST /api/extract/*": { price: "$0.005", description: "HTML content extraction from submitted markup" },
  "GET /api/sanctions/*": { price: "$0.05", description: "Sanctions screening — OFAC, UN, UK HMT lists with fuzzy matching" },
  "GET /api/company/*": { price: "$0.02", description: "Company enrichment — UK Companies House, officers, PSCs, charges" },

  // Group F: Network intelligence + macro data
  "GET /api/asn/*": { price: "$0.005", description: "ASN & BGP intelligence — IP to ASN, org info, peer relationships" },
  "GET /api/economy/*": { price: "$0.005", description: "World Bank economic indicators — GDP, inflation, unemployment, 100+ metrics" },

  // Group G: AI + utilities
  "POST /api/image/generate": { price: "$0.02", description: "AI image generation — Flux and Stable Diffusion XL via Cloudflare Workers AI" },
  "POST /api/inference/complete": { price: "$0.005", description: "LLM text completion — Llama 3.1, Mistral 7B via Cloudflare Workers AI" },
  "POST /api/inference/chat": { price: "$0.005", description: "LLM multi-turn chat — Llama 3.1, Mistral 7B via Cloudflare Workers AI" },
  "GET /api/utils/*": { price: "$0.001", description: "Utility functions — hash, IBAN validation, base64 encode/decode, UUID generation" },

  // Group H: New AI endpoints
  "GET /api/summarize/*": { price: "$0.02", description: "AI URL summarization — fetch, extract, and summarize any web page" },
  "POST /api/classify/*": { price: "$0.02", description: "AI text classification into custom or default categories" },
  "POST /api/entities/*": { price: "$0.02", description: "AI named entity recognition — persons, orgs, locations, dates, money" },

  // Universal MCP server (POST for JSON-RPC tool calls; GET discovery is free)
  "POST /api/mcp": { price: "$0.01", description: "Universal MCP server — 18 tools for AI agents via JSON-RPC" },

  // Prepaid credit bundles
  "POST /api/credits/purchase/starter": { price: "$5.00", description: "Starter credit bundle — 500 queries" },
  "POST /api/credits/purchase/pro": { price: "$25.00", description: "Pro credit bundle — 2,750 queries (10% bonus)" },
  "POST /api/credits/purchase/business": { price: "$100.00", description: "Business credit bundle — 12,000 queries (20% bonus)" },
};

// Canonical leaf paths advertised in /.well-known/x402.
// GET wildcard entries map to a specific representative leaf so the manifest
// advertises paths that return 402, not the stripped parent paths that return 400.
// POST entries use the exact path (no wildcard problem for POST).
export const manifestLeafPaths: Record<string, string> = {
  // GET wildcards — 32 locked leaf paths (AMENDMENT 2, 2026-04-25)
  "GET /api/property/*":       "/api/property/uk/prices",
  "GET /api/property/mcp/*":   "/api/property/mcp",
  "GET /api/predictions/*":    "/api/predictions/markets",
  "GET /api/odds/*":           "/api/odds/sports",
  "GET /api/regulatory/*":     "/api/regulatory/search",
  "GET /api/calendar/*":       "/api/calendar/upcoming",
  "GET /api/filings/*":        "/api/filings/search",
  "GET /api/domain/*":         "/api/domain/lookup/:domain",
  "GET /api/weather/*":        "/api/weather/current",
  "GET /api/fx/*":             "/api/fx/latest",
  "GET /api/ip/*":             "/api/ip/me",
  "GET /api/history/*":        "/api/history/today",
  "GET /api/papers/*":         "/api/papers/search",
  "GET /api/food/*":           "/api/food/search",
  "GET /api/tenders/*":        "/api/tenders/search",
  "GET /api/sentiment/*":      "/api/sentiment/analyze",
  "GET /api/signals/*":        "/api/signals/correlate",
  "GET /api/location/*":       "/api/location/uk/report",
  "GET /api/research/*":       "/api/research/brief",
  "GET /api/email-verify/*":   "/api/email-verify/check/:email",
  "GET /api/qr/*":             "/api/qr/generate",
  "GET /api/crypto/*":         "/api/crypto/price/bitcoin",
  "GET /api/time/*":           "/api/time/now",
  "GET /api/vat/*":            "/api/vat/check/:number",
  "GET /api/stocks/*":         "/api/stocks/quote/:ticker",
  "GET /api/extract/*":        "/api/extract/url",
  "GET /api/sanctions/*":      "/api/sanctions/check",
  "GET /api/company/*":        "/api/company/search",
  "GET /api/asn/*":            "/api/asn/ip/:ip",
  "GET /api/economy/*":        "/api/economy/indicator",
  "GET /api/utils/*":          "/api/utils/uuid",
  "GET /api/summarize/*":      "/api/summarize/url",
  // POST entries — exact paths (strip /* where present)
  "POST /api/property/mcp":          "/api/property/mcp",
  "POST /api/sentiment/*":           "/api/sentiment",
  "POST /api/documents/*":           "/api/documents",
  "POST /api/research/*":            "/api/research",
  "POST /api/translate/*":           "/api/translate",
  "POST /api/extract/*":             "/api/extract",
  "POST /api/classify/*":            "/api/classify",
  "POST /api/entities/*":            "/api/entities",
  "POST /api/image/generate":        "/api/image/generate",
  "POST /api/inference/complete":    "/api/inference/complete",
  "POST /api/inference/chat":        "/api/inference/chat",
  "POST /api/mcp":                   "/api/mcp",
  "POST /api/credits/purchase/starter":  "/api/credits/purchase/starter",
  "POST /api/credits/purchase/pro":      "/api/credits/purchase/pro",
  "POST /api/credits/purchase/business": "/api/credits/purchase/business",
};

// Bazaar discovery schemas for each advertised endpoint.
// Populates queryParams and pathParams in the discovery extension so agents know
// what parameters each endpoint requires before constructing a call.
// Keys match pricingMap keys exactly.
const endpointParamSchemas: Record<string, {
  inputSchema?: Record<string, unknown>;
  pathParamsSchema?: Record<string, unknown>;
}> = {
  "GET /api/property/*": {
    inputSchema: {
      type: "object",
      properties: { postcode: { type: "string", description: "UK postcode (e.g. SW1A 1AA)" } },
      required: ["postcode"],
    },
  },
  "GET /api/predictions/*": {
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Max markets to return (default 20)" } },
    },
  },
  "GET /api/regulatory/*": {
    inputSchema: {
      type: "object",
      properties: {
        q:      { type: "string", description: "Search query" },
        source: { type: "string", description: "Filter by source: all | sec | uk (default all)" },
      },
      required: ["q"],
    },
  },
  "GET /api/calendar/*": {
    inputSchema: {
      type: "object",
      properties: { days: { type: "number", description: "Lookahead window in days (default 7)" } },
    },
  },
  "GET /api/filings/*": {
    inputSchema: {
      type: "object",
      properties: {
        q:         { type: "string", description: "Full-text search query" },
        forms:     { type: "string", description: "Comma-separated form types (e.g. 10-K,10-Q)" },
        dateRange: { type: "string", description: "Date range filter (e.g. 2024-01-01:2024-12-31)" },
      },
      required: ["q"],
    },
  },
  "GET /api/domain/*": {
    pathParamsSchema: {
      type: "object",
      properties: { domain: { type: "string", description: "Domain name (e.g. example.com)" } },
      required: ["domain"],
    },
  },
  "GET /api/weather/*": {
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name (e.g. London)" },
        lat:  { type: "number", description: "Latitude (use with lon)" },
        lon:  { type: "number", description: "Longitude (use with lat)" },
      },
    },
  },
  "GET /api/fx/*": {
    inputSchema: {
      type: "object",
      properties: {
        base:    { type: "string", description: "Base currency code (default USD)" },
        symbols: { type: "string", description: "Comma-separated target currencies (e.g. GBP,EUR)" },
      },
    },
  },
  "GET /api/history/*": {
    inputSchema: {
      type: "object",
      properties: { type: { type: "string", description: "Event type filter (e.g. births, deaths, events)" } },
    },
  },
  "GET /api/papers/*": {
    inputSchema: {
      type: "object",
      properties: {
        q:        { type: "string", description: "Search query" },
        page:     { type: "number", description: "Page number (default 1)" },
        per_page: { type: "number", description: "Results per page (default 10, max 50)" },
      },
      required: ["q"],
    },
  },
  "GET /api/food/*": {
    inputSchema: {
      type: "object",
      properties: {
        q:    { type: "string", description: "Food or product name to search" },
        page: { type: "number", description: "Page number (default 1)" },
      },
      required: ["q"],
    },
  },
  "GET /api/tenders/*": {
    inputSchema: {
      type: "object",
      properties: {
        q:       { type: "string", description: "Keyword search query" },
        country: { type: "string", description: "ISO 2-letter country code filter" },
      },
      required: ["q"],
    },
  },
  "GET /api/sentiment/*": {
    inputSchema: {
      type: "object",
      properties: { topic: { type: "string", description: "Topic or entity to analyse (e.g. Tesla stock)" } },
      required: ["topic"],
    },
  },
  "GET /api/signals/*": {
    inputSchema: {
      type: "object",
      properties: { market: { type: "string", description: "Market identifier (e.g. BTC-USD, AAPL)" } },
      required: ["market"],
    },
  },
  "GET /api/location/*": {
    inputSchema: {
      type: "object",
      properties: {
        postcode: { type: "string", description: "UK postcode (e.g. SW1A 1AA)" },
        lat:      { type: "number", description: "Latitude (use with lng)" },
        lng:      { type: "number", description: "Longitude (use with lat)" },
      },
    },
  },
  "GET /api/research/*": {
    inputSchema: {
      type: "object",
      properties: { topic: { type: "string", description: "Research topic to generate a brief on" } },
      required: ["topic"],
    },
  },
  "GET /api/email-verify/*": {
    pathParamsSchema: {
      type: "object",
      properties: { email: { type: "string", description: "Email address to verify" } },
      required: ["email"],
    },
  },
  "GET /api/qr/*": {
    inputSchema: {
      type: "object",
      properties: {
        data:   { type: "string", description: "Content to encode (URL, text, etc.)" },
        format: { type: "string", description: "Output format: svg | png | json (default svg)" },
        size:   { type: "number", description: "Image size in pixels (50–1000, default 200)" },
        error:  { type: "string", description: "Error correction level: L | M | Q | H (default M)" },
      },
      required: ["data"],
    },
  },
  "GET /api/crypto/*": {
    pathParamsSchema: {
      type: "object",
      properties: { symbol: { type: "string", description: "Token symbol or ID (e.g. bitcoin, ethereum)" } },
      required: ["symbol"],
    },
  },
  "GET /api/time/*": {
    inputSchema: {
      type: "object",
      properties: { timezone: { type: "string", description: "IANA timezone (e.g. Europe/London). Alias: tz" } },
    },
  },
  "GET /api/vat/*": {
    pathParamsSchema: {
      type: "object",
      properties: { number: { type: "string", description: "VAT number with country prefix (e.g. GB123456789)" } },
      required: ["number"],
    },
  },
  "GET /api/stocks/*": {
    pathParamsSchema: {
      type: "object",
      properties: { ticker: { type: "string", description: "Stock ticker symbol (e.g. AAPL, NVDA)" } },
      required: ["ticker"],
    },
  },
  "GET /api/extract/*": {
    inputSchema: {
      type: "object",
      properties: { url: { type: "string", description: "Full URL to extract content from" } },
      required: ["url"],
    },
  },
  "GET /api/sanctions/*": {
    inputSchema: {
      type: "object",
      properties: {
        name:      { type: "string", description: "Person or entity name to screen" },
        threshold: { type: "number", description: "Fuzzy match threshold 0–1 (default 0.8)" },
      },
      required: ["name"],
    },
  },
  "GET /api/company/*": {
    inputSchema: {
      type: "object",
      properties: {
        q:       { type: "string", description: "Company name or number to search" },
        country: { type: "string", description: "ISO 2-letter country code (default GB)" },
      },
      required: ["q"],
    },
  },
  "GET /api/asn/*": {
    pathParamsSchema: {
      type: "object",
      properties: { ip: { type: "string", description: "IP address to look up (e.g. 1.1.1.1)" } },
      required: ["ip"],
    },
  },
  "GET /api/economy/*": {
    inputSchema: {
      type: "object",
      properties: {
        country:   { type: "string", description: "ISO 2-letter country code (e.g. GB)" },
        indicator: { type: "string", description: "World Bank indicator code (e.g. NY.GDP.MKTP.CD)" },
        years:     { type: "number", description: "Number of years of history (default 10)" },
      },
    },
  },
  "GET /api/utils/*": {
    inputSchema: {
      type: "object",
      properties: {
        count:   { type: "number", description: "Number of UUIDs to generate (default 1)" },
        version: { type: "string", description: "UUID version: v4 | v7 (default v4)" },
      },
    },
  },
  "GET /api/summarize/*": {
    inputSchema: {
      type: "object",
      properties: {
        url:    { type: "string", description: "Full URL of the web page to summarize" },
        length: { type: "string", description: "Summary length: short | medium | long (default medium)" },
      },
      required: ["url"],
    },
  },
};

// Build the x402 routes config from the pricing map.
// Each route gets bazaar discovery extensions so it appears in CDP's Bazaar discovery index.
export function buildX402Routes(payTo: string, network: string) {
  const routes: Record<string, {
    accepts: { scheme: string; price: string; network: string; payTo: string };
    description: string;
    mimeType: string;
    extensions: Record<string, unknown>;
  }> = {};

  for (const [route, config] of Object.entries(pricingMap)) {
    const [method] = route.split(" ");
    const isPost = method === "POST";

    const schema = endpointParamSchemas[route] ?? {};
    const extensions = isPost
      ? declareDiscoveryExtension({ bodyType: "json", ...schema })
      : declareDiscoveryExtension({ ...schema });

    routes[route] = {
      accepts: {
        scheme: "exact",
        price: config.price,
        network,
        payTo,
      },
      description: config.description,
      mimeType: "application/json",
      extensions,
    };
  }

  return routes;
}
