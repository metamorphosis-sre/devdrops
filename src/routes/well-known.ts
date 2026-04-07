import { Hono } from "hono";
import type { Env } from "../types";
import { pricingMap } from "../middleware/payment";

const wellKnown = new Hono<{ Bindings: Env }>();

// GET /.well-known/mcp/server-card.json — Smithery server card for MCP registry discovery
wellKnown.get("/mcp/server-card.json", (c) => {
  return c.json({
    serverInfo: { name: "devdrops", version: "1.0.0" },
    description: "43 pay-per-query data APIs as MCP tools. Weather, FX, stocks, crypto, SEC filings, sanctions, sentiment, research, IP, and more. Pay $0.01 USDC per call via x402 on Base mainnet. Free discovery.",
    authentication: { required: false },
    payment: { type: "x402", network: "eip155:8453", currency: "USDC", pricePerCall: "0.01" },
    tools: [
      { name: "get_weather", description: "Current weather or 5-day forecast" },
      { name: "get_fx_rate", description: "Currency exchange rates and conversion" },
      { name: "get_crypto_price", description: "Live crypto prices (2000+ tokens)" },
      { name: "get_stock_quote", description: "Stock quotes (10,000+ tickers)" },
      { name: "search_papers", description: "Academic paper search (OpenAlex)" },
      { name: "search_filings", description: "SEC EDGAR filing search" },
      { name: "get_company_filings", description: "Company SEC filings by ticker" },
      { name: "get_ip_info", description: "IP geolocation" },
      { name: "analyze_sentiment", description: "AI news sentiment analysis" },
      { name: "get_odds", description: "Sports betting odds" },
      { name: "search_food", description: "Food nutrition data" },
      { name: "get_domain_info", description: "WHOIS and DNS info" },
      { name: "verify_vat", description: "EU/UK VAT verification" },
      { name: "check_sanctions", description: "Sanctions screening (OFAC/UN/HMT)" },
      { name: "get_history_today", description: "Historical events today" },
      { name: "generate_qr", description: "QR code generation" },
      { name: "research_topic", description: "AI research brief" },
      { name: "summarize_url", description: "AI web page summarization" },
    ],
  }, 200, { "Cache-Control": "public, max-age=86400" });
});

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
      "43 pay-per-query data APIs for AI agents — prediction markets, property intelligence, " +
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

// GET /.well-known/mcp.json — Universal MCP server discovery manifest
wellKnown.get("/mcp.json", (c) => {
  return c.json({
    schema_version: "v1",
    name_for_human: "DevDrops",
    name_for_model: "devdrops",
    description_for_human: "43 pay-per-query data APIs via MCP — weather, FX, crypto, stocks, filings, sanctions, sentiment, research, IP, and more.",
    description_for_model: "DevDrops exposes 18 tools via MCP JSON-RPC 2.0: get_weather, get_fx_rate, get_crypto_price, get_stock_quote, search_papers, search_filings, get_company_filings, get_ip_info, analyze_sentiment, get_odds, search_food, get_domain_info, verify_vat, check_sanctions, get_history_today, generate_qr, research_topic, summarize_url. Each tool call is paid in USDC on Base mainnet via x402 at $0.01 per call. Discovery (GET) is free. No API keys required.",
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
      url: "https://api.devdrops.run/api/mcp",
      transport: "streamable-http",
      protocol_version: "2024-11-05",
    },
    tools: [
      { name: "get_weather", description: "Current weather or 5-day forecast for any city or coordinates." },
      { name: "get_fx_rate", description: "Currency exchange rates or conversion between any two currencies." },
      { name: "get_crypto_price", description: "Live crypto price and market data (2000+ tokens)." },
      { name: "get_stock_quote", description: "Live stock quote by ticker (10,000+ tickers)." },
      { name: "search_papers", description: "Academic paper search — titles, citations, DOIs via OpenAlex." },
      { name: "search_filings", description: "Search SEC EDGAR filings by keyword." },
      { name: "get_company_filings", description: "Recent SEC filings for a company by ticker." },
      { name: "get_ip_info", description: "IP geolocation — country, city, ISP, coordinates." },
      { name: "analyze_sentiment", description: "AI-powered news sentiment analysis on any topic." },
      { name: "get_odds", description: "Sports betting odds from multiple bookmakers." },
      { name: "search_food", description: "Food nutrition data — calories, allergens, ingredients." },
      { name: "get_domain_info", description: "WHOIS, DNS records, SSL info for any domain." },
      { name: "verify_vat", description: "EU and UK VAT number verification." },
      { name: "check_sanctions", description: "Sanctions screening against OFAC, UN, UK HMT lists." },
      { name: "get_history_today", description: "Historical events that happened on today's date." },
      { name: "generate_qr", description: "Generate a QR code from text or URL." },
      { name: "research_topic", description: "AI research brief — synthesizes news, papers, Wikipedia." },
      { name: "summarize_url", description: "Fetch and summarize any web page with AI." },
    ],
  }, 200, { "Cache-Control": "public, max-age=86400" });
});

// GET /.well-known/ai-plugin.json — ChatGPT / agent plugin manifest
wellKnown.get("/ai-plugin.json", (c) => {
  return c.json({
    schema_version: "v1",
    name_for_human: "DevDrops",
    name_for_model: "devdrops",
    description_for_human: "43 pay-per-query data APIs — weather, FX, crypto, stocks, SEC filings, sanctions, sentiment, research, IP, and more. Pay $0.001–$0.10 USDC per query. No API keys required.",
    description_for_model: "DevDrops provides 43 data API endpoints payable via x402 micropayments in USDC on Base mainnet. Endpoints cover: financial markets (FX rates, crypto prices, stock quotes, prediction markets, sports odds), compliance (sanctions screening, VAT verification, SEC filings, company enrichment), geolocation (IP lookup, UK address intelligence), AI-enhanced data (news sentiment analysis, research briefs, document summarisation, URL summarisation, text classification, named entity recognition), and utilities (weather, QR codes, time zones, translation). A universal MCP server at /api/mcp exposes 18 tools via JSON-RPC 2.0. Free tier: 5 queries/day/IP on select endpoints. Prepaid credit bundles available at /api/credits.",
    auth: { type: "none" },
    api: {
      type: "openapi",
      url: "https://api.devdrops.run/openapi.json",
      is_user_authenticated: false,
    },
    payment: {
      type: "x402",
      network: "base",
      network_id: "eip155:8453",
      currency: "USDC",
      price_range: "$0.001–$0.10 per query",
      facilitator: "https://api.cdp.coinbase.com/platform/v2/x402",
    },
    mcp: {
      url: "https://api.devdrops.run/api/mcp",
      transport: "streamable-http",
      protocol_version: "2024-11-05",
    },
    logo_url: "https://devdrops.run/favicon.ico",
    contact_email: "api@devdrops.run",
    legal_info_url: "https://devdrops.run",
  }, 200, { "Cache-Control": "public, max-age=86400" });
});

// GET /.well-known/llms.txt — AI assistant catalog (llms.txt standard)
wellKnown.get("/llms.txt", (c) => {
  const text = `# DevDrops
> 43 pay-per-query data APIs for AI agents. No accounts, no API keys, no subscriptions.
> Pay USDC per request via x402 micropayments on Base mainnet.
> Free tier: 5 queries/day/IP on select endpoints (FX, crypto, weather, IP, QR, time, history).
> API base: https://api.devdrops.run
> Catalog: https://api.devdrops.run/catalog
> OpenAPI: https://api.devdrops.run/openapi.json
> MCP server: https://api.devdrops.run/api/mcp (18 tools, JSON-RPC 2.0)
> Credits: https://api.devdrops.run/api/credits ($5/$25/$100 bundles)

## How to use
Send any request. If unpaid, you receive HTTP 402 with USDC payment details in the Payment-Required header.
Use @x402/fetch (JS/TS) or x402-requests (Python) to pay automatically.
Minimum price: $0.001 USDC. Maximum: $0.10 USDC. Network: Base mainnet (eip155:8453).

## MCP Server (for AI agents)
POST https://api.devdrops.run/api/mcp — JSON-RPC 2.0, protocol 2024-11-05
Tools: get_weather, get_fx_rate, get_crypto_price, get_stock_quote, search_papers,
       search_filings, get_company_filings, get_ip_info, analyze_sentiment, get_odds,
       search_food, get_domain_info, verify_vat, check_sanctions, get_history_today,
       generate_qr, research_topic, summarize_url

## Endpoints by category

### Property & Real Estate ($0.01/query)
- GET /api/property/* — UK property prices, ownership, House Price Index
- POST /api/property/mcp — Property intelligence MCP tools (JSON-RPC)
- POST /api/mcp — Universal MCP server, 18 tools across all DevDrops products ($0.01)

### Financial Markets ($0.001–$0.05/query)
- GET /api/fx/* — Currency exchange rates, 33 major currencies (ECB data) ($0.001)
- GET /api/crypto/* — Live crypto prices, market cap, 2000+ tokens ($0.001)
- GET /api/stocks/* — Stock quotes, history, movers, 10,000+ tickers ($0.005)
- GET /api/predictions/* — Prediction market odds (Polymarket + Manifold) ($0.005)
- GET /api/odds/* — Sports betting odds, cross-bookmaker comparison ($0.005)
- GET /api/calendar/* — Financial events calendar: FOMC, earnings, IPOs ($0.005)
- GET /api/signals/* — AI cross-market correlation signals ($0.05)

### Compliance & Business Intelligence ($0.01–$0.05/query)
- GET /api/sanctions/* — Sanctions screening, OFAC/UN/UK HMT fuzzy matching ($0.05)
- GET /api/vat/* — EU and UK VAT number verification via VIES and HMRC ($0.01)
- GET /api/company/* — UK company enrichment, officers, PSCs, charges ($0.02)
- GET /api/regulatory/* — Regulatory change feeds, Companies House, SEC, FCA ($0.01)
- GET /api/filings/* — SEC EDGAR filings, full-text search, company filings ($0.01)
- GET /api/tenders/* — Government tenders, UK Contracts Finder + SAM.gov ($0.01)

### Network & Infrastructure ($0.001–$0.005/query)
- GET /api/asn/* — IP to ASN lookup, BGP peer relationships ($0.005)
- GET /api/ip/* — IP geolocation, country, ISP, proxy detection ($0.001)
- GET /api/domain/* — WHOIS, DNS records, SSL certificates, tech stack ($0.005)
- GET /api/email-verify/* — Email validation, MX records, disposable detection ($0.005)

### Data & Research ($0.001–$0.10/query)
- GET /api/economy/* — World Bank economic indicators, 200+ countries ($0.005)
- GET /api/papers/* — Academic papers, abstracts, citations (OpenAlex) ($0.005)
- GET /api/history/* — Historical events, Wikipedia "on this day" ($0.001)
- GET /api/food/* — Nutrition data, 3M+ products (Open Food Facts + USDA) ($0.005)
- GET /api/weather/* — Current weather, forecasts (OpenWeatherMap) ($0.001)
- GET /api/location/* — UK address intelligence, flood risk, crime, schools ($0.02)
- GET /api/extract/* — URL content extraction, clean text from any webpage ($0.005)
- GET /api/research/* — AI research brief generator (Claude) ($0.10)
- GET /api/sentiment/* — AI news sentiment analysis (Claude) ($0.02)
- POST /api/documents/* — AI document summarisation and entity extraction (Claude) ($0.10)

### New AI Endpoints ($0.02/query)
- GET /api/summarize/url?url= — Fetch and summarize any web page with AI ($0.02)
- POST /api/classify/text — Classify text into custom or default categories ($0.02)
- POST /api/entities/extract — Named entity recognition: persons, orgs, locations, money ($0.02)

### AI & Utilities ($0.001–$0.02/query)
- POST /api/image/generate — AI image generation (Flux, SDXL) ($0.02)
- POST /api/inference/complete — LLM completion (Llama 3.1, Mistral 7B) ($0.005)
- POST /api/inference/chat — LLM multi-turn chat ($0.005)
- GET /api/utils/* — Hash, IBAN validation, encode/decode, UUID ($0.001)
- GET /api/qr/* — QR code generation (SVG, PNG, base64) ($0.001)
- GET /api/time/* — Timezone conversion, public holidays, business day checks ($0.001)
- POST /api/translate/* — Text translation, 70+ languages ($0.005)

### Prepaid Credits (no per-tx gas fees)
- GET /api/credits — Bundle info (free)
- GET /api/credits/balance?wallet= — Check balance (free)
- POST /api/credits/purchase/starter — $5 → 500 queries ($5.00 USDC via x402)
- POST /api/credits/purchase/pro — $25 → 2,750 queries, 10% bonus ($25.00 USDC)
- POST /api/credits/purchase/business — $100 → 12,000 queries, 20% bonus ($100.00 USDC)
`;

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
});

export default wellKnown;
