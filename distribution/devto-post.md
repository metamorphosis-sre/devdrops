---
title: I built a universal MCP server with 18 data tools powered by HTTP micropayments
published: true
description: How I built DevDrops — 43 pay-per-query APIs on Cloudflare Workers using x402 micropayments, and this week shipped a universal MCP server for AI agents.
tags: webdev, api, ai, cloudflare
cover_image: https://devdrops.run/og.png
---

A few weeks ago I shipped [DevDrops](https://devdrops.run) — 43 data APIs where payment is built into the HTTP protocol. This week I added a universal MCP server that exposes 18 tools to any AI agent.

Here's how it works and what I built.

## The payment model: x402

Every DevDrops endpoint uses [x402](https://x402.org) — an open HTTP payment standard. Instead of API keys, payment happens in the response cycle:

```bash
# Step 1: Make request, get price
curl https://api.devdrops.run/api/fx/latest
# ← 402 { price: "$0.001", payTo: "0x...", network: "eip155:8453" }

# Step 2: Pay and retry (handled automatically by @x402/fetch)
# ← 200 { EUR: { USD: 1.08, GBP: 0.86, ... } }
```

```javascript
import { wrapFetchWithPayment } from '@x402/fetch';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const pay = wrapFetchWithPayment(fetch, walletClient);

// FX rates — $0.001
const data = await (await pay('https://api.devdrops.run/api/fx/latest')).json();

// Sanctions check — $0.05
const check = await (await pay('https://api.devdrops.run/api/sanctions/check?name=John+Smith')).json();
```

No signup. No API key. No subscription.

## The universal MCP server

The new endpoint at `/api/mcp` is a JSON-RPC 2.0 server implementing the [Model Context Protocol](https://modelcontextprotocol.io) (protocol version 2024-11-05).

Discovery is free:

```bash
curl https://api.devdrops.run/api/mcp
```

Returns 18 available tools: `get_weather`, `get_fx_rate`, `get_crypto_price`, `get_stock_quote`, `search_papers`, `search_filings`, `get_company_filings`, `get_ip_info`, `analyze_sentiment`, `get_odds`, `search_food`, `get_domain_info`, `verify_vat`, `check_sanctions`, `get_history_today`, `generate_qr`, `research_topic`, `summarize_url`.

Tool calls cost $0.01 each via x402:

```json
POST https://api.devdrops.run/api/mcp
X-PAYMENT: <proof>

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_stock_quote",
    "arguments": { "symbol": "NVDA" }
  }
}
```

The MCP server forwards payment headers to the underlying API calls, so the agent pays once and the server handles the internal routing.

## New AI endpoints

Three new Claude Haiku-powered endpoints:

**URL Summarizer** (`GET /api/summarize/url?url=...&length=medium`) — Fetches any URL, strips HTML, sends to Claude, returns title + key points + summary. $0.02. Costs ~$0.001 in API calls.

**Text Classifier** (`POST /api/classify/text`) — Classifies text into 10 default categories or custom ones. Returns primary category, confidence score, reasoning. $0.02.

**Entity Extractor** (`POST /api/entities/extract`) — Named entity recognition. Extracts persons, organizations, locations, dates, money, products, events. $0.02.

## The stack

Everything in a single Cloudflare Worker:

- **Hono** framework — lightweight, fast, excellent TypeScript support
- **@x402/hono** — payment middleware, 5 lines to configure
- **D1 (SQLite) + KV** — two-tier cache. KV at the edge (~1ms), D1 for persistence (~50ms)
- **Cloudflare Workers AI** — GPU inference included in the $5/month plan (Flux, SDXL, Llama, Mistral)
- **Anthropic API** — Claude Haiku for AI-enhanced endpoints
- **Base mainnet** — settlement layer, Coinbase CDP as facilitator

Monthly cost: **$41** (Workers $5 + Odds API $35 + domain $1).

## The MCP implementation

The tricky part of the MCP server was payment forwarding. When an agent calls `tools/call`, the MCP server needs to:

1. Identify which internal API endpoint to hit
2. Forward the agent's payment headers (so the x402 payment applies to the tool call, not get re-charged internally)
3. Return the JSON result wrapped in MCP's content format

```typescript
// Forward payment headers from original request
const headers: Record<string, string> = { Accept: "application/json" };
for (const key of ["x-402-payment", "x-402-receipt", "authorization"]) {
  const val = c.req.header(key);
  if (val) headers[key] = val;
}

const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
const data = await res.json();

return c.json(rpcResult(id, {
  content: [{ type: "text", text: JSON.stringify(data) }],
}));
```

## Free tier

5 queries/day/IP on: FX, crypto, weather, IP, history, QR, time. No wallet needed.

```bash
curl https://api.devdrops.run/api/fx/latest
curl https://api.devdrops.run/api/crypto/top
curl https://api.devdrops.run/api/time/now
curl "https://api.devdrops.run/api/ip/me"
```

## What I've learned

**The MCP angle unlocks a new distribution channel.** MCP registries like Smithery and Glama are growing fast — developers building AI agents look for MCP tools the same way they look for npm packages. Being in those registries is more valuable than RapidAPI for this use case.

**AI endpoints have the best margins.** Claude Haiku costs ~$0.001 per call. I sell the AI endpoints at $0.02–$0.10. 20-100x margin. The commodity data endpoints (FX, crypto) at $0.001 need volume.

**The free tier is crucial for conversion.** The biggest friction isn't price — it's that developers don't have USDC in a Base wallet. 5 free queries/day lets them evaluate without crypto onboarding.

---

**Links:**
- Live: [devdrops.run](https://devdrops.run)
- API catalog: [api.devdrops.run/catalog](https://api.devdrops.run/catalog)
- MCP server: [api.devdrops.run/api/mcp](https://api.devdrops.run/api/mcp)
- GitHub: [github.com/metamorphosis-sre/devdrops](https://github.com/metamorphosis-sre/devdrops)

Questions about x402, Cloudflare Workers, or the MCP implementation welcome.
