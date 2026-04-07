# Smithery MCP Server Submission

Submit at: https://smithery.ai/submit (or via their GitHub if they have a registry PR flow)

## Server Name
DevDrops

## Short Description
43 pay-per-query data APIs as MCP tools — weather, FX, stocks, crypto, SEC filings, sanctions, sentiment, research, IP, and more. Pay USDC per call, no API key required.

## MCP Endpoint
https://api.devdrops.run/api/mcp

## Transport
streamable-http

## Protocol Version
2024-11-05

## Full Description
DevDrops is a universal data API platform where every tool call is paid via x402 micropayments in USDC on Base mainnet. No accounts, no API keys, no subscriptions.

**18 available tools:**
- `get_weather` — Current weather or 5-day forecast (city or lat/lon)
- `get_fx_rate` — Currency exchange rates and conversion (33 currencies)
- `get_crypto_price` — Live crypto prices and market data (2,000+ tokens)
- `get_stock_quote` — Stock quotes by ticker (10,000+ tickers)
- `search_papers` — Academic paper search (OpenAlex, 250M papers)
- `search_filings` — SEC EDGAR full-text filing search
- `get_company_filings` — Recent SEC filings by company ticker
- `get_ip_info` — IP geolocation (country, city, ISP, coordinates)
- `analyze_sentiment` — AI news sentiment analysis on any topic
- `get_odds` — Sports betting odds from multiple bookmakers
- `search_food` — Food nutrition data (Open Food Facts, 3M+ products)
- `get_domain_info` — WHOIS, DNS, SSL certificate information
- `verify_vat` — EU and UK VAT number verification
- `check_sanctions` — Sanctions screening (OFAC, UN, UK HMT)
- `get_history_today` — Historical events on today's date
- `generate_qr` — QR code generation (SVG, PNG, base64)
- `research_topic` — AI research brief (synthesizes news + papers + Wikipedia)
- `summarize_url` — Fetch and summarize any web page with AI

**Pricing:** $0.01 per tool call, paid in USDC on Base mainnet via x402.
**Discovery (GET):** Free — no payment required to list tools.
**Free tier:** Select tools backed by free endpoints get 5 free calls/day/IP.

## Tags
data-apis, weather, finance, crypto, stocks, compliance, sanctions, ai, nlp, research, mcp, x402, payments, base-mainnet

## GitHub
https://github.com/metamorphosis-sre/devdrops

## Website
https://devdrops.run

## OpenAPI
https://api.devdrops.run/openapi.json

## Example call
```json
POST https://api.devdrops.run/api/mcp
Content-Type: application/json
X-PAYMENT: <x402-payment-proof>

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_fx_rate",
    "arguments": { "from": "USD", "to": "GBP", "amount": 100 }
  }
}
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"product\":\"fx\",\"from\":\"USD\",\"to\":\"GBP\",\"amount\":100,\"rate\":0.786,\"result\":78.6}"
    }]
  }
}
```
