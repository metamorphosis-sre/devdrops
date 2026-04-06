# DevDrops — Project Wiki

> Last updated: 2026-04-06

---

## Overview

**DevDrops** (`devdrops.run`) is a suite of 22 pay-per-query data APIs powered by the x402 micropayment protocol. AI agents and developers send a standard HTTP request, receive an HTTP 402 response with a USDC price, pay on Base (Coinbase's L2), and instantly receive structured JSON data. No API keys, no subscriptions, no accounts.

**Landing page:** https://devdrops.run  
**API base:** https://api.devdrops.run  
**GitHub:** https://github.com/metamorphosis-sre/devdrops (private)

---

## Architecture

### Stack

| Layer | Technology |
|---|---|
| Runtime | Cloudflare Workers (Paid, $5/mo) |
| Framework | Hono 4.7 |
| Database | Cloudflare D1 (SQLite at edge) |
| Storage | Cloudflare R2 (nightly backups — pending activation) |
| Cache | Cloudflare KV (edge cache for hot data) |
| Payment | x402 protocol via `@x402/hono` + Coinbase CDP facilitator |
| Language | TypeScript 5.8 |
| Deploy | Wrangler 4.x |

### Payment Flow

```
Agent → GET /api/fx/latest
          ↓
     HTTP 402 + payment requirements (price, network, payTo)
          ↓
     Agent signs USDC payment on Base mainnet
          ↓
     CDP facilitator verifies on-chain (EdDSA JWT auth)
          ↓
     HTTP 200 + JSON data
```

### Key Files

```
src/
├── index.ts              — Hono app entry, payment middleware, route mounting, LANDING_HTML
├── types.ts              — Env bindings + shared TypeScript types
├── middleware/
│   ├── payment.ts        — Pricing map ($0.001–$0.10) + x402 route builder
│   ├── cors.ts           — CORS (allows all origins, GET/POST/OPTIONS)
│   └── logging.ts        — Transaction + abandoned-402 logger → D1
├── lib/
│   ├── cache.ts          — D1 cache read/write helpers
│   ├── fetch.ts          — Upstream fetch wrapper with timeout + error types
│   └── cdp-auth.ts       — Coinbase CDP JWT auth (Ed25519, 64-byte raw key format)
├── routes/
│   ├── health.ts         — GET /health — D1, KV, R2 status
│   ├── catalog.ts        — GET /catalog — machine-readable product list
│   ├── openapi.ts        — GET /openapi.json — OpenAPI 3.1 spec
│   ├── well-known.ts     — GET /.well-known/x402 — agent discovery manifest
│   └── [22 product routers]
├── cron/
│   ├── handler.ts        — Scheduled event dispatcher
│   ├── health-check.ts   — Pings all data_sources, auto-failover on 3 failures
│   └── backup.ts         — Nightly D1 → R2 export (skips if R2 not configured)
└── db/
    ├── schema.sql        — 5 tables: transactions, abandoned_402s, health_log, data_sources, product_cache
    └── seeds.sql         — Upstream API health-check URLs
```

### D1 Schema

| Table | Purpose |
|---|---|
| `transactions` | Every paid x402 request: product, amount, wallet, endpoint, latency |
| `abandoned_402s` | Requests that saw the price but didn't pay |
| `health_log` | Per-source health check results (every 30 min) |
| `data_sources` | Upstream API registry with auto-failover |
| `product_cache` | Generic TTL cache per product/key |

### Cron Triggers

| Schedule | Job |
|---|---|
| `*/30 * * * *` | Health check — pings all data sources, disables/failovers on 3 consecutive failures |
| `0 2 * * *` | Nightly backup — exports all D1 tables to R2 as JSON |

---

## Products (22 — all live)

### Tier 1 — Domain Expertise

| # | Product | Endpoint | Price | Status |
|---|---|---|---|---|
| 1 | Property intelligence | `GET /api/property/*` | $0.01 | Live (402) |
| 2 | Property MCP server | `GET /api/property/mcp/*` | $0.01 | Live (402) |
| 3 | Address intelligence | `GET /api/location/*` | $0.02 | Live (402) |

### Tier 2 — Data Aggregation

| # | Product | Endpoint | Price | Primary Source | Status |
|---|---|---|---|---|---|
| 4 | Prediction markets | `GET /api/predictions/*` | $0.005 | Polymarket + Manifold | Live (402) |
| 5 | Sports odds | `GET /api/odds/*` | $0.005 | The Odds API | Live (402) |
| 6 | Regulatory intelligence | `GET /api/regulatory/*` | $0.01 | Companies House + SEC EDGAR | Live (402) |
| 7 | Company filings | `GET /api/filings/*` | $0.01 | SEC EDGAR + Companies House | Live (402) |
| 8 | Financial calendar | `GET /api/calendar/*` | $0.005 | Trading Economics (scrape) | Live (402) |
| 9 | Domain intelligence | `GET /api/domain/*` | $0.005 | RDAP / DNS / crt.sh | Live (402) |
| 10 | Weather data | `GET /api/weather/*` | $0.001 | OpenWeatherMap | Live (402) |
| 11 | FX rates | `GET /api/fx/*` | $0.001 | Frankfurter (ECB) | Live (402) |
| 12 | IP geolocation | `GET /api/ip/*` | $0.001 | IPinfo.io | Live (402) |
| 13 | Historical events | `GET /api/history/*` | $0.001 | Wikipedia On This Day | Live (402) |
| 14 | Academic papers | `GET /api/papers/*` | $0.005 | OpenAlex + Semantic Scholar | Live (402) |
| 15 | Food & nutrition | `GET /api/food/*` | $0.005 | Open Food Facts | Live (402) |
| 16 | Public tenders | `GET /api/tenders/*` | $0.01 | UK Contracts Finder + SAM.gov | Live (402) |
| 17 | Email verification | `GET /api/email-verify/*` | $0.005 | DNS MX (self-contained) | Live (402) |
| 18 | Text translation | `POST /api/translate/*` | $0.005 | LibreTranslate | Live (402) |

### Tier 3 — AI-Enhanced (Claude API)

| # | Product | Endpoint | Price | Status |
|---|---|---|---|---|
| 19 | News sentiment | `GET /api/sentiment/*` | $0.02 | Live (402) |
| 20 | Cross-market signals | `GET /api/signals/*` | $0.05 | Live (402) |
| 21 | Document summariser | `POST /api/documents/*` | $0.10 | Live (402) |
| 22 | Research brief | `GET /api/research/*` | $0.10 | Live (402) |

### Dropped Products

| Product | Original Source | Reason |
|---|---|---|
| Flights | Amadeus → Kiwi Tequila | Amadeus signup closed; Kiwi Tequila requires form approval — no instant key |
| Jobs | Adzuna → JSearch | Adzuna: 14-day commercial trial only. JSearch: RapidAPI dependency, weak x402 fit |
| Shipping | EasyPost | No free-tier multi-carrier rate API; EasyPost/Shippo require paid plans for rate queries |

---

## Public Endpoints

| URL | Description | Auth |
|---|---|---|
| `https://devdrops.run` | Landing page | None |
| `https://api.devdrops.run` | Landing page (same Worker) | None |
| `https://api.devdrops.run/health` | Health check (D1, KV, R2) | None |
| `https://api.devdrops.run/catalog` | Machine-readable product catalog | None |
| `https://api.devdrops.run/openapi.json` | OpenAPI 3.1 spec | None |
| `https://api.devdrops.run/.well-known/x402` | Agent discovery manifest | None |
| `https://api.devdrops.run/api/*` | All paid endpoints | x402 (USDC on Base) |

---

## Environment & Secrets

### wrangler.toml vars (non-secret)

| Variable | Value |
|---|---|
| `ENVIRONMENT` | `production` |
| `NETWORK` | `eip155:8453` (Base mainnet) |
| `FACILITATOR_URL` | `https://api.cdp.coinbase.com/platform/v2/x402` |
| `PAY_TO_ADDRESS` | `0xc42EAe553c5C2d521d8A0543c265480B380179D2` |

### Secrets

| Secret | Purpose | Status |
|---|---|---|
| `CDP_API_KEY_ID` | Coinbase CDP facilitator auth (key ID) | ✅ Set |
| `CDP_API_KEY_SECRET` | Coinbase CDP facilitator auth (Ed25519 64-byte raw key) | ✅ Set |
| `ANTHROPIC_API_KEY` | Claude API — sentiment, signals, documents, research | ✅ Set |
| `WEATHER_API_KEY` | OpenWeatherMap | ✅ Set |
| `ODDS_API_KEY` | The Odds API | ✅ Set |
| `COMPANIES_HOUSE_API_KEY` | UK Companies House | ✅ Set |

### Cloudflare Bindings

| Binding | Resource | Status |
|---|---|---|
| `DB` | D1 database `devdrops` (ID: `dc92b44a-...`) | ✅ Active |
| `CACHE` | KV namespace (ID: `7973d723-...`) | ✅ Active |
| `STORAGE` | R2 bucket `devdrops-backups` | ❌ Pending — Cloudflare support ticket open |

---

## Deployment

```bash
# Deploy
npx wrangler deploy --env=""

# D1 schema
npx wrangler d1 execute devdrops --remote --file=src/db/schema.sql

# Seed data sources
npx wrangler d1 execute devdrops --remote --file=src/db/seeds.sql

# Set a secret
echo "value" | npx wrangler secret put SECRET_NAME --env=""

# Tail live logs
npx wrangler tail --format=pretty
```

---

## Key Technical Decisions

1. **CDP facilitator (mainnet)** — x402.org only supports testnet; CDP required for Base mainnet
2. **Ed25519 / EdDSA** — New CDP portal keys are 64-byte raw Ed25519, not P-256/ES256
3. **R2 optional** — `STORAGE: R2Bucket | undefined`; backup cron skips gracefully if absent
4. **IPinfo.io over ip-api.com** — ip-api.com free tier is non-commercial
5. **Payment middleware per-request** — Cloudflare Workers have no persistent startup state
6. **`ENVIRONMENT=development` bypasses payment** — useful for local `wrangler dev`
7. **Zone routes for devdrops.run** — existing DNS A records blocked `custom_domain`; `zone_name` routes intercept at proxy level without DNS changes

---

## Discovery & Distribution

| Channel | Status |
|---|---|
| `/.well-known/x402` manifest | ✅ Live at api.devdrops.run/.well-known/x402 |
| `/openapi.json` | ✅ Live — OpenAPI 3.1 with x402 extensions |
| coinbase/x402 Bazaar | ⏳ PR open: coinbase/x402#38 |
| xpaysh/awesome-x402 | ⏳ PR open: xpaysh/awesome-x402#209 |
| x402scan.com | ⏳ Auto-appears after first paid transaction |
| Bankr x402 Cloud | ❌ Skipped — requires re-hosting on their infrastructure |
| MCP registry | 🔲 Pending — Property MCP manifest not yet published |

---

## Pending / Next Steps

| Priority | Task |
|---|---|
| High | R2 bucket — waiting on Cloudflare support ticket |
| Medium | Property MCP manifest file |
| Low | Bankr — revisit if they add external service registration |

---

## Cost Summary

| Item | Cost | Frequency |
|---|---|---|
| Cloudflare Workers Paid | $5 | Monthly |
| The Odds API Standard | $35 | Monthly |
| Claude API (usage-based) | ~$5–50 | Variable |
| devdrops.run domain | ~£10 | Annual |
| **Total fixed** | **~$40–90/mo** | |

---

## Change Log

| Date | Change |
|---|---|
| 2026-04-06 | Initial build: all routes, middleware, D1 schema, cron jobs |
| 2026-04-06 | Fixed ip-api.com → IPinfo.io (commercial licensing) |
| 2026-04-06 | R2 binding commented out pending Cloudflare support |
| 2026-04-06 | Secrets set: ANTHROPIC, WEATHER, ODDS, COMPANIES_HOUSE, CDP |
| 2026-04-06 | HTTP 402 confirmed working on all `/api/*` routes |
| 2026-04-06 | GitHub repo created, initial commit pushed |
| 2026-04-06 | Added OpenAPI 3.1 spec at `/openapi.json` |
| 2026-04-06 | Custom domain `api.devdrops.run` activated |
| 2026-04-06 | Zone routes for `devdrops.run` + `www.devdrops.run` |
| 2026-04-06 | coinbase/x402#38 opened — Bazaar ecosystem listing |
| 2026-04-06 | xpaysh/awesome-x402#209 opened — awesome list listing |
| 2026-04-06 | Dropped flights, jobs, shipping — 22 live products |
| 2026-04-06 | Fixed catalog slug deduplication bug (21 → 22) |
| 2026-04-06 | Added `/.well-known/x402` agent discovery manifest |
