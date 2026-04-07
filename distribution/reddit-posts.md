# Reddit Posts

---

## r/MachineLearning / r/artificial / r/LocalLLaMA

**Title:** I built a universal MCP server with 18 data tools that AI agents pay for per query (no API keys)

**Body:**
I've been building DevDrops — a data API platform where payment is part of the HTTP protocol. This week I added a universal MCP server.

**The MCP server:** https://api.devdrops.run/api/mcp

18 tools including: weather, FX rates, stock quotes, crypto prices, SEC filings, sanctions screening, news sentiment analysis, academic paper search, domain WHOIS, VAT verification, URL summarization, text classification, and named entity recognition.

Discovery (GET) is free. Tool calls are $0.01 each, paid in USDC on Base mainnet via the x402 protocol.

**What makes this different from other MCP servers:**
- Pay per call, no subscription or API key required
- AI agents can autonomously discover and pay for tools without human involvement
- 43 underlying data products across the platform
- Works with Claude, Cursor, GPT, any MCP-compatible client

**Quick test (no payment needed for discovery):**
```bash
curl https://api.devdrops.run/api/mcp
```

**GitHub:** https://github.com/metamorphosis-sre/devdrops

Happy to answer questions about the x402 payment protocol, Cloudflare Workers architecture, or MCP implementation.

---

## r/webdev / r/programming

**Title:** Show HN style: I built 43 pay-per-query data APIs on Cloudflare Workers — $41/month to run

**Body:**
TL;DR: DevDrops (https://devdrops.run) is 43 data APIs where you pay per request in USDC. No signup, no API key, no subscription. Monthly infra cost is $41.

**The idea:** Use the x402 HTTP payment protocol so API access works without accounts. You get a 402 response with a price, pay USDC, get your data.

**What's available:**
- Financial: FX rates, crypto, stocks, prediction markets, sports odds, financial calendar
- Compliance: sanctions screening (OFAC/UN/HMT), VAT verification, SEC filings, company data
- AI: sentiment analysis, research briefs, URL summarization, text classification, NER
- Infrastructure: IP geolocation, WHOIS/DNS, email verification, ASN/BGP
- Data: weather, food nutrition, academic papers, World Bank economics, government tenders
- Agent tools: Universal MCP server (18 tools), prepaid credit bundles

**Stack:** Hono on Cloudflare Workers, D1+KV for caching, Claude Haiku for AI endpoints, x402 for payment.

**The economics:**
- Fixed costs: $41/month
- Break-even: 820 queries at $0.05 (sanctions), or 41K at $0.001 (FX)
- AI endpoints: ~20x margin (Haiku costs $0.001, sells for $0.02)

Free tier: 5 queries/day/IP on select endpoints. Just curl it.

---

## r/sideprojects / r/indiehackers

**Title:** Launched: 43 data APIs with crypto micropayments — $0 MRR but the tech works perfectly

**Body:**
After a few weeks of building I've got DevDrops to 43 live data API products. The honest update: technical side is solid, revenue side is $0 so far.

Here's what's working:
✅ 43 endpoints live and responding
✅ Payment gate returns proper 402 with x402 payment instructions
✅ Free tier (5 queries/day/IP) working
✅ Universal MCP server with 18 tools
✅ CI passing, healthchecks green
✅ D1 + KV caching reducing upstream API costs

What I'm working on:
- Distribution (hence this post)
- Stripe integration for non-crypto developers
- Getting listed on RapidAPI, Smithery, Glama

The technology (x402 micropayments, Cloudflare Workers, MCP) is genuinely interesting. The business problem is getting developers to (a) have USDC in a wallet and (b) know DevDrops exists.

If you're building AI agents that need data, give it a try: https://devdrops.run

What would make you use something like this over a traditional API subscription?

---

## r/ethereum / r/CryptoCurrency / r/defi

**Title:** Built a commerce site on Base mainnet where every API call costs $0.001–$0.10 USDC — x402 micropayments in production

**Body:**
DevDrops (https://devdrops.run) is running x402 micropayments in production on Base mainnet.

The x402 protocol: you make an HTTP request, get a 402 back with { price, payTo, network }, pay USDC, retry with payment proof, get your response. No accounts, no subscriptions, no off-chain payment rails.

We're one of the first commercial x402 deployments at this scale (43 products). Some stats:
- Minimum transaction: $0.001 USDC
- Maximum transaction: $0.10 USDC (for AI endpoints)
- Network: Base mainnet (eip155:8453)
- Facilitator: Coinbase CDP
- No gas for callers — payment is USDC transfer, not contract interaction

The challenge: getting developers to have USDC in a Base wallet ready to use. Working on Stripe integration as a fiat onramp.

New this week: prepaid credit bundles ($5/$25/$100 USDC) that let you buy credits once and use them without per-transaction overhead.

GitHub: https://github.com/metamorphosis-sre/devdrops
