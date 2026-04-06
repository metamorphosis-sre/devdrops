# DevDrops — Project Wiki

> Last updated: 2026-04-06

---

## Overview

**DevDrops** (`devdrops.run`) is a suite of 25 pay-per-query data APIs powered by the x402 micropayment protocol. AI agents and developers send a standard HTTP request, receive an HTTP 402 response with a USDC price, pay on Base (Coinbase's L2), and instantly receive structured JSON data. No API keys, no subscriptions, no accounts.

**Live URL:** https://devdrops-api.pchawla.workers.dev  
**Production domain (pending):** https://api.devdrops.run  
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
├── index.ts              — Hono app entry, payment middleware, route mounting
├── types.ts              — Env bindings + shared TypeScript types
├── middleware/
│   ├── payment.ts        — Pricing map ($0.001–$0.10) + x402 route builder
│   ├── cors.ts           — CORS (allows all origins, GET/POST/OPTIONS)
│   └── logging.ts        — Transaction + abandoned-402 logger → D1
├── lib/
│   ├── cache.ts          — D1 cache read/write helpers
│   ├── fetch.ts          — Upstream fetch wrapper with timeout + error types
│   └── cdp-auth.ts       — Coinbase CDP JWT auth (Ed25519, 64-byte raw key format)
├── routes/               — 25 product routers (one file per product)
├── cron/
│   ├── handler.ts        — Scheduled event dispatcher
│   ├── health-check.ts   — Pings all data_sources, auto-failover on 3 failures
│   └── backup.ts         — Nightly D1 → R2 export (skips gracefully if R2 not configured)
└── db/
    ├── schema.sql        — 5 tables: transactions, abandoned_402s, health_log, data_sources, product_cache
    └── seeds.sql         — 29 upstream API health-check URLs (one per product + backups)
```

### D1 Schema

| Table | Purpose |
|---|---|
| `transactions` | Every paid x402 request: product, amount, wallet, endpoint, latency |
| `abandoned_402s` | Requests that saw the price but didn't pay |
| `health_log` | Per-source health check results (every 30 min) |
| `data_sources` | Upstream API registry with auto-failover (29 rows seeded) |
| `product_cache` | Generic TTL cache per product/key |

### Cron Triggers

| Schedule | Job |
|---|---|
| `*/30 * * * *` | Health check — pings all data sources, disables/failovers on 3 consecutive failures |
| `0 2 * * *` | Nightly backup — exports all D1 tables to R2 as JSON |

---

## Products (25)

### Tier 1 — Domain Expertise

| # | Product | Endpoint | Price | Status |
|---|---|---|---|---|
| 1 | Property intelligence | `GET /api/property/*` | $0.01–$0.05 | Live (402) |
| 2 | Property MCP server | `GET /api/property/mcp/*` | $0.01 | Live (402) |
| 3 | Address intelligence | `GET /api/location/*` | $0.02 | Live (402) |

### Tier 2 — Data Aggregation

| # | Product | Endpoint | Price | Primary Source | Status |
|---|---|---|---|---|---|
| 4 | Prediction markets | `GET /api/predictions/*` | $0.005 | Polymarket Gamma + Manifold | Live (402) |
| 5 | Sports odds | `GET /api/odds/*` | $0.005 | The Odds API | Live (402) |
| 6 | Regulatory intelligence | `GET /api/regulatory/*` | $0.01 | Companies House + SEC EDGAR | Live (402) |
| 7 | Company filings | `GET /api/filings/*` | $0.01 | SEC EDGAR + Companies House | Live (402) |
| 8 | Financial calendar | `GET /api/calendar/*` | $0.005 | Trading Economics (scrape) | Live (402) |
| 9 | Domain intelligence | `GET /api/domain/*` | $0.005 | RDAP / DNS / crt.sh | Live (402) |
| 10 | Weather data | `GET /api/weather/*` | $0.001 | OpenWeatherMap | Live (402) |
| 11 | FX rates | `GET /api/fx/*` | $0.001 | Frankfurter (ECB) | Live (402) |
| 12 | IP geolocation | `GET /api/ip/*` | $0.001 | IPinfo.io (commercial OK) | Live (402) |
| 13 | Historical events | `GET /api/history/*` | $0.001 | Wikipedia On This Day | Live (402) |
| 14 | Academic papers | `GET /api/papers/*` | $0.005 | OpenAlex + Semantic Scholar | Live (402) |
| 15 | Food & nutrition | `GET /api/food/*` | $0.005 | Open Food Facts | Live (402) |
| 16 | Public tenders | `GET /api/tenders/*` | $0.01 | UK Contracts Finder + SAM.gov | Live (402) |
| 17 | Email verification | `GET /api/email-verify/*` | $0.005 | DNS MX (self-contained) | Live (402) |
| 18 | Flight search | `GET /api/flights/*` | $0.01 | Amadeus | 503 (key needed) |
| 19 | Job market | `GET /api/jobs/*` | $0.01 | Adzuna | 503 (key needed) |
| 20 | Shipping rates | `GET /api/shipping/*` | $0.01 | EasyPost | 503 (key needed) |
| 21 | Text translation | `POST /api/translate/*` | $0.005 | LibreTranslate | Live (402) |

### Tier 3 — AI-Enhanced (Claude API)

| # | Product | Endpoint | Price | Status |
|---|---|---|---|---|
| 22 | News sentiment | `GET /api/sentiment/*` | $0.02 | Live (402) |
| 23 | Cross-market signals | `GET /api/signals/*` | $0.05 | Live (402) |
| 24 | Document summariser | `POST /api/documents/*` | $0.10 | Live (402) |
| 25 | Research brief | `GET /api/research/*` | $0.10 | Live (402) |

---

## Environment & Secrets

### wrangler.toml vars (non-secret)

| Variable | Value |
|---|---|
| `ENVIRONMENT` | `production` |
| `NETWORK` | `eip155:8453` (Base mainnet) |
| `FACILITATOR_URL` | `https://api.cdp.coinbase.com/platform/v2/x402` |
| `PAY_TO_ADDRESS` | `0xc42EAe553c5C2d521d8A0543c265480B380179D2` |

### Secrets (set via `wrangler secret put`)

| Secret | Purpose | Status |
|---|---|---|
| `CDP_API_KEY_ID` | Coinbase CDP facilitator auth (key ID) | ✅ Set |
| `CDP_API_KEY_SECRET` | Coinbase CDP facilitator auth (Ed25519 64-byte raw key) | ✅ Set |
| `ANTHROPIC_API_KEY` | Claude API — sentiment, signals, documents, research | ✅ Set |
| `WEATHER_API_KEY` | OpenWeatherMap | ✅ Set |
| `ODDS_API_KEY` | The Odds API | ✅ Set |
| `COMPANIES_HOUSE_API_KEY` | UK Companies House | ✅ Set |
| `AMADEUS_API_KEY` | Amadeus (flights) | ❌ Not set |
| `AMADEUS_API_SECRET` | Amadeus (flights) | ❌ Not set |
| `ADZUNA_APP_ID` | Adzuna (jobs) | ❌ Not set |
| `ADZUNA_API_KEY` | Adzuna (jobs) | ❌ Not set |
| `EASYPOST_API_KEY` | EasyPost (shipping) | ❌ Not set |

### Cloudflare Bindings

| Binding | Resource | Status |
|---|---|---|
| `DB` | D1 database `devdrops` (ID: `dc92b44a-...`) | ✅ Active |
| `CACHE` | KV namespace (ID: `7973d723-...`) | ✅ Active |
| `STORAGE` | R2 bucket `devdrops-backups` | ❌ Pending — R2 not enabled on account yet (Cloudflare support ticket open) |

---

## Deployment

### Commands

```bash
# Deploy (default environment)
npx wrangler deploy --env=""

# Initialize D1 schema
npx wrangler d1 execute devdrops --remote --file=src/db/schema.sql

# Seed data sources
npx wrangler d1 execute devdrops --remote --file=src/db/seeds.sql

# Set a secret
echo "value" | npx wrangler secret put SECRET_NAME --env=""

# Tail live logs
npx wrangler tail --format=pretty

# List secrets
npx wrangler secret list --env=""
```

### Endpoints

| URL | Description |
|---|---|
| `https://devdrops-api.pchawla.workers.dev` | Landing page |
| `https://devdrops-api.pchawla.workers.dev/health` | Health check (D1, KV, R2) |
| `https://devdrops-api.pchawla.workers.dev/catalog` | Machine-readable API catalog |
| `https://devdrops-api.pchawla.workers.dev/api/*` | All paid endpoints (returns 402) |

---

## Key Technical Decisions

### 1. CDP facilitator over x402.org facilitator
The free x402.org facilitator only supports Base Sepolia (testnet). For Base mainnet, Coinbase's CDP facilitator (`api.cdp.coinbase.com/platform/v2/x402`) is required. This needs a CDP portal API key with EdDSA auth.

### 2. Ed25519 (EdDSA), not P-256 (ES256)
New CDP API keys from `portal.cdp.coinbase.com` use Ed25519 (64-byte raw format: first 32 bytes = seed, last 32 bytes = public key). The JWT header must specify `"alg": "EdDSA"`. Older CDP keys used P-256/ES256 PEM format.

### 3. R2 is optional — backup job gracefully skips
R2 binding commented out in `wrangler.toml` until Cloudflare support enables it. `STORAGE` typed as `R2Bucket | undefined` in `Env`. Backup cron checks for it and skips with a log message rather than crashing.

### 4. ip-api.com replaced with IPinfo.io
ip-api.com's free tier is non-commercial only. IPinfo.io's free tier (50K lookups/month) explicitly allows commercial use.

### 5. Payment middleware instantiated per-request
`paymentMiddlewareFromConfig` is called on every `/api/*` request rather than at app startup. This is because Cloudflare Workers don't have persistent startup state and the facilitator `initialize()` call (which hits CDP to fetch supported payment kinds) must happen within request context where `env` bindings are available.

### 6. `ENVIRONMENT=development` bypasses payment
Setting `ENVIRONMENT=development` in wrangler.toml skips the x402 middleware entirely — useful for local testing with `wrangler dev`. Currently set to `production` in the deployed Worker.

---

## Data Source Decisions (Errata)

Per `docs/devdrops-errata-final.md`:

| Product | Original Source | Replaced With | Reason |
|---|---|---|---|
| Weather | Open-Meteo | OpenWeatherMap | Open-Meteo free tier is non-commercial |
| IP lookup | ip-api.com | IPinfo.io | ip-api.com free tier is non-commercial |
| Email verify | Full SMTP | Syntax + MX + disposable only | Port 25 blocked on Workers; SMTP deliverability unreliable |

---

## Pending / Next Steps

| Priority | Task | Notes |
|---|---|---|
| High | Custom domain `api.devdrops.run` | Point to Worker in Cloudflare dashboard |
| High | OpenAPI spec at `/openapi.json` | Critical for Bazaar agent discovery |
| High | x402 Bazaar registration | PR to `coinbase/x402` ecosystem page |
| Medium | R2 bucket activation | Waiting on Cloudflare support |
| Medium | Amadeus, Adzuna, EasyPost keys | Unlocks flights, jobs, shipping |
| Medium | `devdrops.run` landing page | On Cloudflare Pages (separate from Worker) |
| Low | Stripe MPP payment rail | Apply for early access; UK entity = card payments only for stablecoins |
| Low | Property MCP server manifest | MCP tools declared, no manifest file yet |

---

## Discovery Channels (to register)

- [ ] x402 Bazaar (Coinbase CDP) — `discoverable: true` in middleware config
- [ ] x402scan.com — auto-appears after first paid transaction
- [ ] Bankr marketplace — submit endpoints
- [ ] Stripe MPP service directory — pending MPP early access
- [ ] MCP registry — for Property MCP server (#2)
- [ ] PR to `coinbase/x402` repo ecosystem page
- [ ] awesome-x402 GitHub list

---

## Cost Summary

| Item | Cost | Frequency |
|---|---|---|
| Cloudflare Workers Paid | $5 | Monthly |
| The Odds API Standard | $35 | Monthly (when live) |
| Claude API (usage-based) | ~$5–50 | Variable |
| devdrops.run domain | ~£10 | Annual |
| **Total fixed** | **~$40–90/mo** | |

---

## Change Log

| Date | Change |
|---|---|
| 2026-04-06 | Initial build: all 25 routes, middleware, D1 schema, cron jobs |
| 2026-04-06 | Fixed ip-api.com → IPinfo.io (commercial licensing) |
| 2026-04-06 | Fixed extractPrice in logging middleware |
| 2026-04-06 | R2 binding commented out pending Cloudflare support |
| 2026-04-06 | Landing page updated to 25 products, wired into Worker |
| 2026-04-06 | data_sources table seeded with 29 upstream health-check URLs |
| 2026-04-06 | PAY_TO_ADDRESS set to `0xc42E…79D2` |
| 2026-04-06 | Secrets set: ANTHROPIC, WEATHER, ODDS, COMPANIES_HOUSE, CDP credentials |
| 2026-04-06 | Added `@x402/evm` ExactEvmScheme registration |
| 2026-04-06 | Switched to Coinbase CDP facilitator (mainnet) |
| 2026-04-06 | Diagnosed CDP key as Ed25519 (not P-256) — fixed cdp-auth.ts |
| 2026-04-06 | HTTP 402 confirmed working on all `/api/*` routes |
| 2026-04-06 | GitHub repo created, initial commit |
