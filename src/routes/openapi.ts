import { Hono } from "hono";
import type { Env } from "../types";

const openapi = new Hono<{ Bindings: Env }>();

const SPEC = {
  openapi: "3.1.0",
  info: {
    title: "DevDrops",
    version: "1.0.0",
    description:
      "25 pay-per-query data APIs powered by the x402 micropayment protocol. " +
      "Send a request, receive HTTP 402 with a USDC price, pay on Base (Coinbase L2), get structured JSON. " +
      "No API keys, no subscriptions, no accounts required.",
    contact: { url: "https://devdrops.run" },
    "x-payment-protocol": "x402",
    "x-payment-network": "eip155:8453",
    "x-payment-currency": "USDC",
  },
  servers: [
    { url: "https://api.devdrops.run", description: "Production" },
    { url: "https://devdrops-api.pchawla.workers.dev", description: "Staging" },
  ],
  tags: [
    { name: "FX", description: "Currency exchange rates (ECB / Frankfurter)" },
    { name: "Weather", description: "Current conditions and forecasts (OpenWeatherMap)" },
    { name: "IP", description: "IP geolocation (IPinfo.io)" },
    { name: "History", description: "On this day historical events (Wikipedia)" },
    { name: "Predictions", description: "Prediction market feeds (Polymarket + Manifold)" },
    { name: "Odds", description: "Sports betting odds (The Odds API)" },
    { name: "Domain", description: "Domain intelligence (RDAP / DNS / crt.sh)" },
    { name: "Email", description: "Email verification (DNS MX)" },
    { name: "Food", description: "Food & nutrition data (Open Food Facts)" },
    { name: "Papers", description: "Academic paper search (OpenAlex + Semantic Scholar)" },
    { name: "Filings", description: "SEC and Companies House filings" },
    { name: "Regulatory", description: "Regulatory intelligence (SEC EDGAR + Companies House)" },
    { name: "Calendar", description: "Financial events calendar" },
    { name: "Tenders", description: "Public tender notices (UK Contracts Finder + SAM.gov)" },
    { name: "Property", description: "UK property intelligence" },
    { name: "Location", description: "UK address intelligence (flood, crime, amenities)" },
    { name: "Translate", description: "Text translation (LibreTranslate)" },
    { name: "Jobs", description: "Job market & salary data (JSearch)" },
    { name: "Sentiment", description: "AI news sentiment analysis (Claude)" },
    { name: "Signals", description: "AI cross-market signals (Claude)" },
    { name: "Documents", description: "AI document summarisation (Claude)" },
    { name: "Research", description: "AI research briefs (Claude)" },
  ],
  paths: {
    // ── FX ──────────────────────────────────────────────────────────────────
    "/api/fx/latest": {
      get: {
        tags: ["FX"],
        summary: "Latest exchange rates",
        description: "ECB reference rates updated daily. Base currency defaults to EUR. **Price: $0.001 USDC**",
        "x-price-usd": 0.001,
        parameters: [
          { name: "base", in: "query", schema: { type: "string", default: "EUR" }, description: "Base currency code" },
          { name: "symbols", in: "query", schema: { type: "string" }, description: "Comma-separated target currencies (e.g. USD,GBP)" },
        ],
        responses: {
          "200": { description: "Exchange rates", content: { "application/json": { schema: { $ref: "#/components/schemas/FxRates" } } } },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/fx/convert": {
      get: {
        tags: ["FX"],
        summary: "Currency conversion",
        description: "Convert an amount between two currencies. **Price: $0.001 USDC**",
        "x-price-usd": 0.001,
        parameters: [
          { name: "from", in: "query", required: true, schema: { type: "string" }, description: "Source currency (e.g. USD)" },
          { name: "to", in: "query", required: true, schema: { type: "string" }, description: "Target currency (e.g. GBP)" },
          { name: "amount", in: "query", schema: { type: "number", default: 1 }, description: "Amount to convert" },
        ],
        responses: {
          "200": { description: "Conversion result", content: { "application/json": { schema: { $ref: "#/components/schemas/FxConversion" } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/fx/currencies": {
      get: {
        tags: ["FX"],
        summary: "List available currencies",
        description: "All supported currency codes and names. **Price: $0.001 USDC**",
        "x-price-usd": 0.001,
        responses: {
          "200": { description: "Currency list" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/fx/historical": {
      get: {
        tags: ["FX"],
        summary: "Historical exchange rates",
        description: "ECB rates for a specific date. **Price: $0.001 USDC**",
        "x-price-usd": 0.001,
        parameters: [
          { name: "date", in: "query", required: true, schema: { type: "string", format: "date" }, description: "Date in YYYY-MM-DD format" },
          { name: "base", in: "query", schema: { type: "string", default: "EUR" }, description: "Base currency" },
        ],
        responses: {
          "200": { description: "Historical rates" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Weather ──────────────────────────────────────────────────────────────
    "/api/weather/current": {
      get: {
        tags: ["Weather"],
        summary: "Current weather conditions",
        description: "Current weather by city name or coordinates. **Price: $0.001 USDC**",
        "x-price-usd": 0.001,
        parameters: [
          { name: "city", in: "query", schema: { type: "string" }, description: "City name (e.g. London). Required if lat/lon omitted." },
          { name: "lat", in: "query", schema: { type: "number" }, description: "Latitude. Required if city omitted." },
          { name: "lon", in: "query", schema: { type: "number" }, description: "Longitude. Required if city omitted." },
        ],
        responses: {
          "200": { description: "Current weather" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/weather/forecast": {
      get: {
        tags: ["Weather"],
        summary: "Weather forecast",
        description: "5-day weather forecast by city or coordinates. **Price: $0.001 USDC**",
        "x-price-usd": 0.001,
        parameters: [
          { name: "city", in: "query", schema: { type: "string" }, description: "City name. Required if lat/lon omitted." },
          { name: "lat", in: "query", schema: { type: "number" }, description: "Latitude. Required if city omitted." },
          { name: "lon", in: "query", schema: { type: "number" }, description: "Longitude. Required if city omitted." },
          { name: "days", in: "query", schema: { type: "integer" }, description: "Number of forecast days" },
        ],
        responses: {
          "200": { description: "Forecast data" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── IP ───────────────────────────────────────────────────────────────────
    "/api/ip/me": {
      get: {
        tags: ["IP"],
        summary: "Geolocate requesting IP",
        description: "Returns geolocation of the caller's IP address. **Price: $0.001 USDC**",
        "x-price-usd": 0.001,
        responses: {
          "200": { description: "IP geolocation" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/ip/lookup/{ip}": {
      get: {
        tags: ["IP"],
        summary: "Geolocate any IP",
        description: "Returns geolocation for a given IP address. **Price: $0.001 USDC**",
        "x-price-usd": 0.001,
        parameters: [
          { name: "ip", in: "path", required: true, schema: { type: "string" }, description: "IPv4 or IPv6 address" },
        ],
        responses: {
          "200": { description: "IP geolocation" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── History ──────────────────────────────────────────────────────────────
    "/api/history/today": {
      get: {
        tags: ["History"],
        summary: "Historical events for today",
        description: "On-this-day events from Wikipedia for today's date. **Price: $0.001 USDC**",
        "x-price-usd": 0.001,
        parameters: [
          { name: "type", in: "query", schema: { type: "string", enum: ["all", "selected", "births", "deaths", "events", "holidays"], default: "all" } },
        ],
        responses: {
          "200": { description: "Historical events" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/history/{mm}/{dd}": {
      get: {
        tags: ["History"],
        summary: "Historical events for a specific date",
        description: "On-this-day events from Wikipedia for any month/day. **Price: $0.001 USDC**",
        "x-price-usd": 0.001,
        parameters: [
          { name: "mm", in: "path", required: true, schema: { type: "string" }, description: "Month (01–12)" },
          { name: "dd", in: "path", required: true, schema: { type: "string" }, description: "Day (01–31)" },
          { name: "type", in: "query", schema: { type: "string", enum: ["all", "selected", "births", "deaths", "events", "holidays"], default: "all" } },
        ],
        responses: {
          "200": { description: "Historical events" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Predictions ──────────────────────────────────────────────────────────
    "/api/predictions/markets": {
      get: {
        tags: ["Predictions"],
        summary: "Trending prediction markets",
        description: "Active markets from Polymarket and Manifold, sorted by volume. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 20 }, description: "Number of markets per source" },
        ],
        responses: {
          "200": { description: "Prediction markets" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/predictions/search": {
      get: {
        tags: ["Predictions"],
        summary: "Search prediction markets",
        description: "Search open markets by keyword. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" }, description: "Search query (e.g. election)" },
        ],
        responses: {
          "200": { description: "Matching markets" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/predictions/polymarket": {
      get: {
        tags: ["Predictions"],
        summary: "Polymarket active markets",
        description: "Top active markets from Polymarket by 24h volume. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        responses: {
          "200": { description: "Polymarket markets" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/predictions/manifold": {
      get: {
        tags: ["Predictions"],
        summary: "Manifold trending markets",
        description: "Trending open markets from Manifold by liquidity. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        responses: {
          "200": { description: "Manifold markets" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Odds ─────────────────────────────────────────────────────────────────
    "/api/odds/sports": {
      get: {
        tags: ["Odds"],
        summary: "List available sports",
        description: "All sports with active betting markets. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        responses: {
          "200": { description: "Sports list" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/odds/events/{sport}": {
      get: {
        tags: ["Odds"],
        summary: "Odds for a sport",
        description: "Live and upcoming odds across bookmakers for a sport. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        parameters: [
          { name: "sport", in: "path", required: true, schema: { type: "string" }, description: "Sport key (e.g. soccer_epl)" },
          { name: "regions", in: "query", schema: { type: "string", default: "us,uk,eu" }, description: "Comma-separated regions" },
          { name: "markets", in: "query", schema: { type: "string", default: "h2h" }, description: "Market type (h2h, spreads, totals)" },
        ],
        responses: {
          "200": { description: "Betting odds" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/odds/scores/{sport}": {
      get: {
        tags: ["Odds"],
        summary: "Live scores for a sport",
        description: "Live and recent scores for a sport. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        parameters: [
          { name: "sport", in: "path", required: true, schema: { type: "string" }, description: "Sport key" },
        ],
        responses: {
          "200": { description: "Scores" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Domain ───────────────────────────────────────────────────────────────
    "/api/domain/lookup/{domain}": {
      get: {
        tags: ["Domain"],
        summary: "Full domain intelligence",
        description: "RDAP registration, DNS records, and SSL certificate info for a domain. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        parameters: [
          { name: "domain", in: "path", required: true, schema: { type: "string" }, description: "Domain name (e.g. example.com)" },
        ],
        responses: {
          "200": { description: "Domain intelligence" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/domain/dns/{domain}": {
      get: {
        tags: ["Domain"],
        summary: "DNS records",
        description: "Query DNS records for a domain. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        parameters: [
          { name: "domain", in: "path", required: true, schema: { type: "string" } },
          { name: "type", in: "query", schema: { type: "string", default: "A" }, description: "Record type (A, MX, TXT, NS, CNAME, AAAA)" },
        ],
        responses: {
          "200": { description: "DNS records" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/domain/whois/{domain}": {
      get: {
        tags: ["Domain"],
        summary: "WHOIS / RDAP lookup",
        description: "Domain registration and registrar info via RDAP. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        parameters: [
          { name: "domain", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "RDAP data" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Email ─────────────────────────────────────────────────────────────────
    "/api/email-verify/check/{email}": {
      get: {
        tags: ["Email"],
        summary: "Verify email address",
        description: "Syntax validation, MX record check, disposable domain detection. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        parameters: [
          { name: "email", in: "path", required: true, schema: { type: "string", format: "email" }, description: "Email address to verify" },
        ],
        responses: {
          "200": { description: "Verification result", content: { "application/json": { schema: { $ref: "#/components/schemas/EmailVerification" } } } },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Food ──────────────────────────────────────────────────────────────────
    "/api/food/search": {
      get: {
        tags: ["Food"],
        summary: "Search food products",
        description: "Search 3M+ products in Open Food Facts by name. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" }, description: "Product name or ingredient" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        ],
        responses: {
          "200": { description: "Food products" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/food/barcode/{code}": {
      get: {
        tags: ["Food"],
        summary: "Lookup by barcode",
        description: "Full nutritional info for a product by EAN/UPC barcode. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        parameters: [
          { name: "code", in: "path", required: true, schema: { type: "string" }, description: "EAN-13 or UPC barcode" },
        ],
        responses: {
          "200": { description: "Product data" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/food/usda/search": {
      get: {
        tags: ["Food"],
        summary: "USDA food search",
        description: "Search USDA FoodData Central. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "USDA food data" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Papers ────────────────────────────────────────────────────────────────
    "/api/papers/search": {
      get: {
        tags: ["Papers"],
        summary: "Search academic papers",
        description: "Search academic literature via OpenAlex and Semantic Scholar. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" }, description: "Search query" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "per_page", in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: {
          "200": { description: "Academic papers" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/papers/work/{id}": {
      get: {
        tags: ["Papers"],
        summary: "Get paper by OpenAlex ID",
        description: "Full metadata for a work by its OpenAlex ID. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "OpenAlex work ID (e.g. W2741809807)" },
        ],
        responses: {
          "200": { description: "Paper metadata" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Filings ───────────────────────────────────────────────────────────────
    "/api/filings/search": {
      get: {
        tags: ["Filings"],
        summary: "Search SEC filings",
        description: "Full-text search across SEC EDGAR filings. **Price: $0.01 USDC**",
        "x-price-usd": 0.01,
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" }, description: "Search term" },
          { name: "dateRange", in: "query", schema: { type: "string" }, description: "Date range: YYYY-MM-DD,YYYY-MM-DD" },
          { name: "forms", in: "query", schema: { type: "string" }, description: "Comma-separated form types (e.g. 10-K,10-Q)" },
        ],
        responses: {
          "200": { description: "Filing results" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/filings/company/{ticker}": {
      get: {
        tags: ["Filings"],
        summary: "Filings by company ticker",
        description: "Recent SEC filings for a US-listed company. **Price: $0.01 USDC**",
        "x-price-usd": 0.01,
        parameters: [
          { name: "ticker", in: "path", required: true, schema: { type: "string" }, description: "Stock ticker (e.g. AAPL)" },
        ],
        responses: {
          "200": { description: "Company filings" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/filings/recent": {
      get: {
        tags: ["Filings"],
        summary: "Recent SEC filings",
        description: "Latest filings across all companies by form type. **Price: $0.01 USDC**",
        "x-price-usd": 0.01,
        parameters: [
          { name: "forms", in: "query", schema: { type: "string", default: "10-K,10-Q,8-K" }, description: "Comma-separated form types" },
        ],
        responses: {
          "200": { description: "Recent filings" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Regulatory ────────────────────────────────────────────────────────────
    "/api/regulatory/search": {
      get: {
        tags: ["Regulatory"],
        summary: "Cross-jurisdiction regulatory search",
        description: "Search SEC EDGAR and UK Companies House simultaneously. **Price: $0.01 USDC**",
        "x-price-usd": 0.01,
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" } },
          { name: "source", in: "query", schema: { type: "string", enum: ["all", "sec", "uk"], default: "all" } },
        ],
        responses: {
          "200": { description: "Regulatory results" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/regulatory/sec/recent": {
      get: {
        tags: ["Regulatory"],
        summary: "Recent SEC regulatory filings",
        description: "Latest SEC filings filtered by form type. **Price: $0.01 USDC**",
        "x-price-usd": 0.01,
        parameters: [
          { name: "forms", in: "query", schema: { type: "string", default: "8-K,S-1,DEF 14A" } },
        ],
        responses: {
          "200": { description: "Recent SEC filings" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/regulatory/uk/company/{number}": {
      get: {
        tags: ["Regulatory"],
        summary: "UK Companies House profile",
        description: "Company registration details from Companies House. **Price: $0.01 USDC**",
        "x-price-usd": 0.01,
        parameters: [
          { name: "number", in: "path", required: true, schema: { type: "string" }, description: "Companies House registration number" },
        ],
        responses: {
          "200": { description: "Company profile" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/regulatory/uk/filings/{number}": {
      get: {
        tags: ["Regulatory"],
        summary: "UK Companies House filings",
        description: "Filing history for a UK company. **Price: $0.01 USDC**",
        "x-price-usd": 0.01,
        parameters: [
          { name: "number", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Filing history" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Calendar ──────────────────────────────────────────────────────────────
    "/api/calendar/upcoming": {
      get: {
        tags: ["Calendar"],
        summary: "Upcoming financial events",
        description: "FOMC, ECB, BoE decisions, earnings dates and economic releases. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        parameters: [
          { name: "days", in: "query", schema: { type: "integer", default: 7 }, description: "Look-ahead window in days" },
        ],
        responses: {
          "200": { description: "Upcoming events" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/calendar/fomc": {
      get: {
        tags: ["Calendar"],
        summary: "FOMC meeting schedule",
        description: "Federal Reserve FOMC meeting dates. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        responses: {
          "200": { description: "FOMC dates" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/calendar/earnings": {
      get: {
        tags: ["Calendar"],
        summary: "Earnings calendar",
        description: "Upcoming earnings announcements by date. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        parameters: [
          { name: "date", in: "query", schema: { type: "string", format: "date" }, description: "Date in YYYY-MM-DD format (defaults to today)" },
        ],
        responses: {
          "200": { description: "Earnings schedule" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Tenders ───────────────────────────────────────────────────────────────
    "/api/tenders/search": {
      get: {
        tags: ["Tenders"],
        summary: "Search public tenders",
        description: "Government contract opportunities from UK Contracts Finder and SAM.gov. **Price: $0.01 USDC**",
        "x-price-usd": 0.01,
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" }, description: "Search terms" },
          { name: "country", in: "query", schema: { type: "string", enum: ["uk", "us"], default: "uk" } },
        ],
        responses: {
          "200": { description: "Tender notices" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/tenders/uk/recent": {
      get: {
        tags: ["Tenders"],
        summary: "Recent UK tenders",
        description: "Latest UK government contract notices. **Price: $0.01 USDC**",
        "x-price-usd": 0.01,
        responses: {
          "200": { description: "Recent UK tenders" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/tenders/us/recent": {
      get: {
        tags: ["Tenders"],
        summary: "Recent US tenders (SAM.gov)",
        description: "Latest US federal contract opportunities. **Price: $0.01 USDC**",
        "x-price-usd": 0.01,
        responses: {
          "200": { description: "Recent US tenders" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Property ──────────────────────────────────────────────────────────────
    "/api/property/uk/prices": {
      get: {
        tags: ["Property"],
        summary: "UK property prices by postcode",
        description: "Land Registry sold prices for a UK postcode. **Price: $0.01 USDC**",
        "x-price-usd": 0.01,
        parameters: [
          { name: "postcode", in: "query", required: true, schema: { type: "string" }, description: "UK postcode (e.g. SW1A 1AA)" },
        ],
        responses: {
          "200": { description: "Property sale prices" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/property/uk/company/{number}": {
      get: {
        tags: ["Property"],
        summary: "Property ownership by company",
        description: "Properties registered to a UK company number. **Price: $0.01 USDC**",
        "x-price-usd": 0.01,
        parameters: [
          { name: "number", in: "path", required: true, schema: { type: "string" }, description: "Companies House number" },
        ],
        responses: {
          "200": { description: "Company property holdings" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/property/uk/index": {
      get: {
        tags: ["Property"],
        summary: "UK House Price Index",
        description: "ONS House Price Index by region. **Price: $0.01 USDC**",
        "x-price-usd": 0.01,
        parameters: [
          { name: "region", in: "query", schema: { type: "string", default: "united-kingdom" }, description: "Region slug" },
        ],
        responses: {
          "200": { description: "HPI data" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Location ──────────────────────────────────────────────────────────────
    "/api/location/uk/report": {
      get: {
        tags: ["Location"],
        summary: "UK address intelligence report",
        description: "Flood risk, crime stats, school ratings, transport links for a UK location. **Price: $0.02 USDC**",
        "x-price-usd": 0.02,
        parameters: [
          { name: "postcode", in: "query", schema: { type: "string" }, description: "UK postcode. Required if lat/lng omitted." },
          { name: "lat", in: "query", schema: { type: "number" }, description: "Latitude. Required if postcode omitted." },
          { name: "lng", in: "query", schema: { type: "number" }, description: "Longitude. Required if postcode omitted." },
        ],
        responses: {
          "200": { description: "Location intelligence report" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/location/uk/flood": {
      get: {
        tags: ["Location"],
        summary: "UK flood risk",
        description: "Environment Agency flood risk for a location. **Price: $0.02 USDC**",
        "x-price-usd": 0.02,
        parameters: [
          { name: "lat", in: "query", required: true, schema: { type: "number" } },
          { name: "lng", in: "query", required: true, schema: { type: "number" } },
        ],
        responses: {
          "200": { description: "Flood risk data" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/location/uk/crime": {
      get: {
        tags: ["Location"],
        summary: "UK crime statistics",
        description: "Police crime data for a location. **Price: $0.02 USDC**",
        "x-price-usd": 0.02,
        parameters: [
          { name: "lat", in: "query", required: true, schema: { type: "number" } },
          { name: "lng", in: "query", required: true, schema: { type: "number" } },
        ],
        responses: {
          "200": { description: "Crime statistics" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Translate ─────────────────────────────────────────────────────────────
    "/api/translate": {
      post: {
        tags: ["Translate"],
        summary: "Translate text",
        description: "Translate text between 100+ languages via LibreTranslate. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["q", "target"],
                properties: {
                  q: { type: "string", description: "Text to translate" },
                  source: { type: "string", description: "Source language code (omit for auto-detect)" },
                  target: { type: "string", description: "Target language code (e.g. es, fr, de)" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Translation result" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/translate/languages": {
      get: {
        tags: ["Translate"],
        summary: "List supported languages",
        description: "All languages supported by LibreTranslate. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        responses: {
          "200": { description: "Supported languages" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/translate/detect": {
      post: {
        tags: ["Translate"],
        summary: "Detect language",
        description: "Detect the language of a piece of text. **Price: $0.005 USDC**",
        "x-price-usd": 0.005,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["q"],
                properties: { q: { type: "string", description: "Text to detect" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Detected language" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Jobs ──────────────────────────────────────────────────────────────────
    "/api/jobs/search": {
      get: {
        tags: ["Jobs"],
        summary: "Search job listings",
        description: "Live job postings by keyword and location via JSearch (aggregates Indeed, LinkedIn, Glassdoor, ZipRecruiter). **Price: $0.01 USDC**",
        "x-price-usd": 0.01,
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" }, description: "Job title or keyword" },
          { name: "location", in: "query", schema: { type: "string" }, description: "Location name" },
          { name: "country", in: "query", schema: { type: "string", default: "gb" }, description: "2-letter country code" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        ],
        responses: {
          "200": { description: "Job listings" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },
    "/api/jobs/salary": {
      get: {
        tags: ["Jobs"],
        summary: "Salary range data",
        description: "Salary ranges for a job title in a region. **Price: $0.01 USDC**",
        "x-price-usd": 0.01,
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" }, description: "Job title" },
          { name: "country", in: "query", schema: { type: "string", default: "gb" } },
          { name: "location", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Salary data" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },
    "/api/jobs/categories": {
      get: {
        tags: ["Jobs"],
        summary: "Job categories",
        description: "Available job categories for a country. **Price: $0.01 USDC**",
        "x-price-usd": 0.01,
        parameters: [
          { name: "country", in: "query", schema: { type: "string", default: "gb" } },
        ],
        responses: {
          "200": { description: "Job categories" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },

    // ── Sentiment ─────────────────────────────────────────────────────────────
    "/api/sentiment/analyze": {
      get: {
        tags: ["Sentiment"],
        summary: "News sentiment analysis (GET)",
        description: "AI-powered sentiment scoring for a topic or ticker. Powered by Claude. **Price: $0.02 USDC**",
        "x-price-usd": 0.02,
        parameters: [
          { name: "topic", in: "query", required: true, schema: { type: "string" }, description: "Company, ticker, or topic (e.g. AAPL, bitcoin)" },
        ],
        responses: {
          "200": { description: "Sentiment analysis" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
      post: {
        tags: ["Sentiment"],
        summary: "Analyse provided text (POST)",
        description: "Score the sentiment of text you supply. Powered by Claude. **Price: $0.02 USDC**",
        "x-price-usd": 0.02,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["text"],
                properties: {
                  text: { type: "string", description: "Text to analyse" },
                  topic: { type: "string", description: "Optional context topic" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Sentiment analysis" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Signals ───────────────────────────────────────────────────────────────
    "/api/signals/correlate": {
      get: {
        tags: ["Signals"],
        summary: "Cross-market signals",
        description: "Correlates prediction odds + news sentiment + calendar events for a market. Powered by Claude. **Price: $0.05 USDC**",
        "x-price-usd": 0.05,
        parameters: [
          { name: "market", in: "query", required: true, schema: { type: "string" }, description: "Market slug or topic (e.g. btc-price-2026)" },
        ],
        responses: {
          "200": { description: "Signal analysis" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Documents ─────────────────────────────────────────────────────────────
    "/api/documents/summarize": {
      post: {
        tags: ["Documents"],
        summary: "Summarise a document",
        description: "Submit a contract, filing, or text. Returns structured summary with key terms, risks, and obligations. Powered by Claude. **Price: $0.10 USDC**",
        "x-price-usd": 0.10,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["text"],
                properties: {
                  text: { type: "string", description: "Document text (max ~10K tokens)" },
                  type: { type: "string", description: "Document type hint (contract, filing, planning, generic)" },
                },
              },
            },
            "text/plain": { schema: { type: "string" } },
          },
        },
        responses: {
          "200": { description: "Structured document summary" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
    "/api/documents/extract": {
      post: {
        tags: ["Documents"],
        summary: "Extract structured data",
        description: "Extract key entities, dates, and clauses from a document. Powered by Claude. **Price: $0.10 USDC**",
        "x-price-usd": 0.10,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["text"],
                properties: { text: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Extracted data" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },

    // ── Research ──────────────────────────────────────────────────────────────
    "/api/research/brief": {
      get: {
        tags: ["Research"],
        summary: "Generate research brief (GET)",
        description: "AI-generated structured brief for any topic. Powered by Claude. **Price: $0.10 USDC**",
        "x-price-usd": 0.10,
        parameters: [
          { name: "topic", in: "query", required: true, schema: { type: "string" }, description: "Research topic or question" },
        ],
        responses: {
          "200": { description: "Research brief" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
      post: {
        tags: ["Research"],
        summary: "Generate research brief (POST)",
        description: "Research brief with focus and depth control. Powered by Claude. **Price: $0.10 USDC**",
        "x-price-usd": 0.10,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["topic"],
                properties: {
                  topic: { type: "string" },
                  focus: { type: "string", description: "Specific angle or focus area" },
                  depth: { type: "string", enum: ["quick", "standard", "deep"], default: "standard" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Research brief" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "402": { $ref: "#/components/responses/PaymentRequired" },
        },
      },
    },
  },
  components: {
    responses: {
      PaymentRequired: {
        description:
          "HTTP 402 — x402 payment required. The response body contains payment requirements. " +
          "Pay in USDC on Base (eip155:8453) to the address specified.",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                x402Version: { type: "integer", example: 1 },
                error: { type: "string", example: "Payment Required" },
                accepts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      scheme: { type: "string", example: "exact" },
                      network: { type: "string", example: "eip155:8453" },
                      maxAmountRequired: { type: "string", example: "1000" },
                      resource: { type: "string" },
                      description: { type: "string" },
                      mimeType: { type: "string", example: "application/json" },
                      payTo: { type: "string", example: "0xc42EAe553c5C2d521d8A0543c265480B380179D2" },
                      maxTimeoutSeconds: { type: "integer", example: 300 },
                      asset: { type: "string", example: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
                      extra: { type: "object" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      BadRequest: {
        description: "Bad request — missing or invalid parameters",
        content: {
          "application/json": {
            schema: { type: "object", properties: { error: { type: "string" } } },
          },
        },
      },
      ServiceUnavailable: {
        description: "Service unavailable — upstream API key not configured",
        content: {
          "application/json": {
            schema: { type: "object", properties: { error: { type: "string" }, detail: { type: "string" } } },
          },
        },
      },
    },
    schemas: {
      FxRates: {
        type: "object",
        properties: {
          product: { type: "string", example: "fx" },
          cached: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              base: { type: "string", example: "EUR" },
              date: { type: "string", format: "date" },
              rates: { type: "object", additionalProperties: { type: "number" } },
            },
          },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      FxConversion: {
        type: "object",
        properties: {
          product: { type: "string" },
          from: { type: "string" },
          to: { type: "string" },
          amount: { type: "number" },
          rate: { type: "number" },
          result: { type: "number" },
          date: { type: "string", format: "date" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      EmailVerification: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          valid: { type: "boolean" },
          checks: {
            type: "object",
            properties: {
              syntax: { type: "boolean" },
              mx: { type: "boolean" },
              disposable: { type: "boolean" },
            },
          },
          domain: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
    },
  },
};

openapi.get("/", (c) => {
  return c.json(SPEC, 200, {
    "Cache-Control": "public, max-age=3600",
  });
});

export default openapi;
