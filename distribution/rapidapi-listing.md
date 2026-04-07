# RapidAPI Listing

Submit at: https://rapidapi.com/provider/dashboard

## API Name
DevDrops Data APIs

## Category
Data / Finance & Economics (primary), AI/ML (secondary)

## Tagline
43 pay-per-query data APIs — sanctions, filings, FX, stocks, weather, AI, and more. No signup required.

## Description (for RapidAPI listing)
DevDrops provides 43 structured data API endpoints across finance, compliance, AI, and intelligence. Unlike traditional APIs with monthly subscriptions, DevDrops uses x402 micropayments — you pay per request in USDC on Base mainnet, with no account or API key required.

**Highlights:**
- **Sanctions screening** — OFAC, UN Security Council, UK HMT fuzzy name matching with confidence scores ($0.05/query)
- **SEC filings** — Full-text search across EDGAR, company-specific filings, recent filings feed ($0.01/query)
- **Stock quotes** — Live prices, historical data, market movers for 10,000+ tickers ($0.005/query)
- **Prediction markets** — Polymarket and Manifold aggregated odds ($0.005/query)
- **FX rates** — 33 major currencies, ECB data, real-time conversion ($0.001/query)
- **AI sentiment** — Claude-powered news sentiment analysis on any topic ($0.02/query)
- **AI research** — Research briefs synthesizing news, papers, and Wikipedia ($0.10/query)
- **URL summarization** — Fetch and summarize any web page with AI ($0.02/query)
- **Universal MCP server** — 18 tools for AI agents via JSON-RPC 2.0 ($0.01/call)

**Free tier:** 5 queries/day/IP on FX, crypto, weather, IP, history, QR, and time endpoints.

## Base URL
https://api.devdrops.run

## OpenAPI Spec URL
https://api.devdrops.run/openapi.json

## Pricing Plans to list on RapidAPI
(Map to RapidAPI's per-request pricing model)

- **Free**: 5 queries/day on select endpoints
- **Basic**: $0.001–$0.01 per request (commodity data)
- **Pro**: $0.02–$0.05 per request (AI + compliance)
- **Enterprise**: $0.10 per request (research briefs, document processing)

## Key endpoints to highlight
1. `GET /api/sanctions/check?name={name}` — Sanctions screening
2. `GET /api/filings/search?q={query}` — SEC filing search
3. `GET /api/stocks/quote/{symbol}` — Stock quote
4. `GET /api/fx/latest?base=USD` — FX rates
5. `GET /api/sentiment/analyze?topic={topic}` — AI sentiment
6. `GET /api/research/brief?topic={topic}` — AI research brief
7. `GET /api/summarize/url?url={url}` — URL summarizer
8. `POST /api/mcp` — Universal MCP server

## Tags
sanctions, compliance, stocks, finance, fx, crypto, weather, ai, nlp, sentiment, research, mcp, data-api, sec-filings
