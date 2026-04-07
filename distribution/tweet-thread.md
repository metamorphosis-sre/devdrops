# Tweet Thread

---

**Tweet 1 (hook)**
I built 43 data APIs where AI agents pay per query in USDC.

No API keys. No signups. No subscriptions.

Just HTTP 402 + a fraction of a cent.

Here's what I shipped this week 🧵

---

**Tweet 2 (the protocol)**
The x402 protocol turns payment into HTTP:

```
→ GET /api/fx/latest
← 402 { price: "$0.001", payTo: "0x..." }

→ GET /api/fx/latest + X-PAYMENT: <proof>
← 200 { USD: 1.08, GBP: 0.86, ... }
```

Your agent discovers the price, pays USDC on Base, gets the data.
No human in the loop.

@x402xyz @coinbase

---

**Tweet 3 (MCP)**
This week I added a universal MCP server.

POST https://api.devdrops.run/api/mcp

18 tools: weather, FX, stocks, crypto, SEC filings, sanctions, sentiment, research, IP geolocation, domain info, VAT, odds, food, QR, history, and more.

Claude, Cursor, GPT — any MCP client works out of the box.
Discovery is free. $0.01/call via x402.

@anthropic

---

**Tweet 4 (AI endpoints)**
New AI endpoints powered by Claude Haiku:

• /api/summarize/url — summarize any web page ($0.02)
• /api/classify/text — classify text into categories ($0.02)
• /api/entities/extract — NER: persons, orgs, locations, money ($0.02)

Cost: ~$0.001 in API calls. Revenue: $0.02.
20x margin on AI.

---

**Tweet 5 (credit bundles)**
Also added prepaid credit bundles:

Starter: $5 → 500 queries
Pro: $25 → 2,750 queries (+10%)
Business: $100 → 12,000 queries (+20%)

Buy with USDC via x402. No per-transaction gas friction.
Check balance free: /api/credits/balance?wallet=0x...

---

**Tweet 6 (economics)**
Monthly fixed cost: $41
(Cloudflare $5 + Odds API $35 + domain $1)

Break-even on the AI tier: 820 queries/month
Break-even on the commodity tier: 41,000 queries/month

The MCP + AI endpoints are the real revenue lever.

---

**Tweet 7 (free tier)**
Free tier for humans:
5 queries/day/IP on FX, crypto, weather, IP, history, QR, time.

No wallet needed. Just curl.

```bash
curl https://api.devdrops.run/api/fx/latest
curl https://api.devdrops.run/api/crypto/top
curl "https://api.devdrops.run/api/ip/me"
```

---

**Tweet 8 (CTA)**
43 products. $0.001–$0.10 per query. No signup.

→ devdrops.run
→ api.devdrops.run/catalog
→ api.devdrops.run/api/mcp (MCP server)
→ github.com/metamorphosis-sre/devdrops

If you're building AI agents that need data, try it.

---

# Standalone tweets (single posts for different audiences)

**For MCP/AI builders:**
Just shipped: a pay-per-query MCP server with 18 tools.

POST /api/mcp → get_weather, get_fx_rate, get_stock_quote, search_papers, check_sanctions, analyze_sentiment, research_topic, summarize_url...

$0.01/call in USDC via x402. Discovery free. No API key.

https://api.devdrops.run/api/mcp @anthropic @x402xyz

---

**For x402/crypto builders:**
DevDrops now has 43 x402-native data APIs.

New this week:
• Universal MCP server (18 tools)
• AI endpoints: summarize, classify, NER
• Prepaid USDC credit bundles ($5/$25/$100)

Built on Cloudflare Workers + Base mainnet.

https://devdrops.run @coinbase @x402xyz

---

**For Cloudflare/developer audience:**
Built 43 pay-per-query APIs on Cloudflare Workers.

Stack:
• Hono framework
• x402 payment middleware
• D1 + KV two-tier cache
• Workers AI for GPU endpoints
• Claude Haiku for AI endpoints

Monthly infra cost: $5 (Workers plan covers D1, KV, Workers AI).

github.com/metamorphosis-sre/devdrops
