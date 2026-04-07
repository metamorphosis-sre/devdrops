# Hacker News — Show HN

## Title
Show HN: DevDrops – 43 data APIs you pay for with USDC micropayments, no signup

## Text
I built DevDrops (https://devdrops.run) — 43 data API endpoints where payment is part of the HTTP protocol.

You send a GET request. You get a 402 back with { price: "$0.001", payTo: "0x...", network: "eip155:8453" }. You pay USDC, retry with a payment header, and get your data. No account, no API key, no subscription.

This week I added a universal MCP server at /api/mcp that exposes 18 tools to any AI agent via JSON-RPC 2.0 — works with Claude, Cursor, and any MCP-compatible client. The agent discovers tools for free, then pays $0.01 per tool call.

**What's live:**
- FX rates, crypto prices, stock quotes ($0.001–$0.005)
- Sports odds, prediction markets, financial calendar ($0.005)
- SEC EDGAR filings, sanctions screening (OFAC/UN/HMT), VAT verification ($0.01–$0.05)
- UK property intelligence, company enrichment, address data ($0.01–$0.02)
- AI endpoints: sentiment analysis, research briefs, URL summarization, text classification, NER ($0.02–$0.10)
- LLM inference, image generation via Cloudflare Workers AI ($0.005–$0.02)
- Universal MCP server — 18 tools ($0.01/call)
- Prepaid credit bundles — $5/$25/$100, no per-tx gas

**The payment protocol:**
x402 (https://x402.org) — an open standard for HTTP micropayments. The @x402/fetch package wraps fetch() and handles payment automatically. Settles on Base mainnet via Coinbase's CDP facilitator.

**Stack:**
- Cloudflare Workers (Hono framework)
- x402 payment middleware
- D1 (SQLite) + KV for two-tier caching
- Cloudflare Workers AI for image/LLM endpoints
- Claude Haiku for AI-enhanced endpoints
- Base mainnet, USDC

Monthly fixed cost is $41 (Workers plan + Odds API). Break-even is ~820 queries on the premium tier.

Free tier: 5 queries/day/IP on FX, crypto, weather, IP, history, QR, and time endpoints.

GitHub: https://github.com/metamorphosis-sre/devdrops
