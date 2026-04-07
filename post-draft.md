# I built 43 pay-per-query data APIs where AI agents pay in crypto — here's everything I learned

A few weeks ago I shipped [DevDrops](https://devdrops.run) — 43 data API endpoints where you don't sign up, don't get an API key, and don't pay a monthly bill. You send an HTTP request, get told a price in the response, pay a fraction of a cent in USDC, and get your data back. The whole thing runs on Cloudflare Workers and settles on Base mainnet.

This week I added a universal MCP server (18 tools, works with Claude/Cursor/GPT out of the box), three new AI endpoints (summarize, classify, entity extraction), and prepaid credit bundles. Here's everything I learned building it.

---

## The problem I was solving

Every data API product has the same awkward onboarding:

1. Sign up with email
2. Verify email
3. Pick a plan
4. Enter payment details
5. Get API key
6. Read docs
7. Make your first request

For a human developer building a product, this is mildly annoying. For an autonomous AI agent that needs weather data for a single task, this is completely broken. The agent can't sign up for anything. It can't have a credit card. It can't manage a subscription.

The [x402 payment protocol](https://x402.org) solves this. An agent makes an HTTP request, receives a `402 Payment Required` response with payment instructions (price, wallet address, network), pays USDC from its own wallet, includes the payment proof in a retry, and gets the data. No human in the loop. No account. No API key.

---

## The architecture

Everything runs in a single Cloudflare Worker using [Hono](https://hono.dev). Choice of Workers was deliberate:

- **Zero cold starts** — payment verification needs to be fast
- **D1 + KV included** — caching and persistence without managing a database
- **Workers AI included** — image generation and LLM inference on Cloudflare's GPU infrastructure, included in the $5/month plan

The payment flow:

```
Agent → GET /api/fx/latest
         ← 402 { price: "$0.001", payTo: "0x...", network: "eip155:8453" }

Agent → GET /api/fx/latest + X-PAYMENT header (signed EVM proof)
         ← 200 { rates: { USD: 1.08, GBP: 0.86, ... } }
```

The `@x402/hono` middleware handles this in ~5 lines. The hard part was the CDP facilitator.

### The CDP facilitator problem

x402 requires a "facilitator" — a service that verifies the payment was actually made on-chain. The reference facilitator only supports testnet. For Base mainnet I used Coinbase's CDP facilitator.

The new CDP portal issues Ed25519 keys, not P-256. The x402 SDK expected PEM-formatted EC keys. Getting auth headers right took longer than I'd like to admit. If you're building on x402 mainnet, [the fix is here](https://github.com/metamorphosis-sre/devdrops/blob/main/src/lib/cdp-auth.ts).

### Two-tier caching is essential

I use KV (edge cache, ~1ms) for hot data and D1 (SQLite, ~50ms) for persistence. TTLs vary:

| Endpoint | TTL | Reason |
|---|---|---|
| FX rates | 1 hour | ECB updates daily |
| Crypto prices | 60 seconds | Volatile |
| Sports odds | 5 minutes | Pre-game changes |
| IP geolocation | 1 hour | Stable per IP |
| Property data | 1 hour | Land Registry |
| Sanctions lists | 24 hours | Refreshed by cron |

Without this, you'd exhaust upstream rate limits within an hour at any real volume.

---

## What I built: 43 endpoints across 5 tiers

**Tier 1 — Domain expertise ($0.01–$0.02)**
Property intelligence (UK Land Registry), address intelligence (flood risk, crime, schools), company enrichment (Companies House + OpenCorporates). Hard to replicate because they aggregate multiple sources requiring individual setup.

**Tier 2 — Data aggregation ($0.001–$0.01)**
Prediction markets, sports odds, SEC filings, FX rates, crypto prices, stocks (10,000+ tickers), weather, IP geolocation, WHOIS/DNS, email verification, VAT validation, sanctions screening (OFAC/UN/HMT), ASN/BGP, World Bank economics, historical events, food nutrition, academic papers, government tenders.

**Tier 3 — AI-enhanced ($0.02–$0.10)**
News sentiment analysis, cross-market signals, document summarisation, research brief generation, **URL summarization** (new), **text classification** (new), **named entity recognition** (new). All powered by Claude Haiku. Priced to cover API costs with margin.

**Tier 4 — Agent infrastructure**
- **Universal MCP server** at `/api/mcp` (new) — 18 tools via JSON-RPC 2.0, protocol 2024-11-05. Works with Claude, Cursor, GPT, and any MCP-compatible agent. $0.01/call.
- **Prepaid credit bundles** at `/api/credits` (new) — $5/25/100 USDC. 10-20% bonus on larger bundles. No per-transaction gas friction.

**Tier 5 — Utilities ($0.001)**
QR codes, hashing, IBAN validation, timezone/holidays, UUID, base64. Pure compute, zero upstream cost.

---

## The MCP server: why this matters

The universal MCP server at `https://api.devdrops.run/api/mcp` exposes 18 tools to any AI agent:

```json
POST /api/mcp
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

The agent discovers tools via `GET /api/mcp` (free), then pays $0.01 per tool call via x402. No configuration, no API keys, no accounts.

MCP registries (Smithery, Glama) are to AI agents what npm is to Node developers. Being listed there is a different discovery channel than traditional API directories.

---

## The economics

Monthly fixed costs:
- Cloudflare Workers Paid plan: $5
- The Odds API: $35
- Domain: ~$1/month
- **Total: ~$41/month**

Variable: Claude API, ~$5–50 depending on AI endpoint volume.

**Break-even: $41/month**. At $0.05/query (sanctions), that's 820 queries. At $0.001 (FX), that's 41,000 queries.

The AI endpoints and MCP server are the real revenue lever — 20x margin on Claude Haiku ($0.001 cost, $0.02 price).

---

## What I got wrong

**Discovery is still human-driven.** The x402 vision is autonomous agent discovery and payment. In practice, most adoption today is developer-driven: a human builds an agent and manually adds DevDrops endpoints. The autonomous path exists (CDP Bazaar, `.well-known/x402`, MCP registries) but isn't the dominant use case yet.

**Should have started with one killer product.** The sanctions screening endpoint is unique — no x402 alternative, enterprise compliance teams pay $5,000/month for this from Refinitiv. I built 43 products instead of making that one exceptional.

**Free tier should come first.** The biggest friction isn't price — it's that developers don't have USDC in a wallet. The 5 query/day free tier on select endpoints helps, but a Web2 payment option (Stripe) would unlock a much bigger market.

---

## Quick start

```javascript
import { wrapFetchWithPayment } from '@x402/fetch';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const account = privateKeyToAccount('0xYOUR_PRIVATE_KEY');
const client = createWalletClient({ account, chain: base, transport: http() });
const pay = wrapFetchWithPayment(fetch, client);

// FX rates — $0.001
const fx = await pay('https://api.devdrops.run/api/fx/latest?base=USD');

// Sanctions check — $0.05
const sanctions = await pay('https://api.devdrops.run/api/sanctions/check?name=John+Smith');

// AI summary of any URL — $0.02
const summary = await pay('https://api.devdrops.run/api/summarize/url?url=https://techcrunch.com');

// MCP tool call — $0.01
const mcp = await pay('https://api.devdrops.run/api/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0', id: 1,
    method: 'tools/call',
    params: { name: 'get_stock_quote', arguments: { symbol: 'NVDA' } }
  })
});
```

---

## Links

- **Live**: [devdrops.run](https://devdrops.run)
- **API**: [api.devdrops.run/catalog](https://api.devdrops.run/catalog)
- **MCP**: [api.devdrops.run/api/mcp](https://api.devdrops.run/api/mcp)
- **OpenAPI**: [api.devdrops.run/openapi.json](https://api.devdrops.run/openapi.json)
- **GitHub**: [github.com/metamorphosis-sre/devdrops](https://github.com/metamorphosis-sre/devdrops)

Happy to answer questions about x402 implementation, Cloudflare Workers architecture, or the data sources.
