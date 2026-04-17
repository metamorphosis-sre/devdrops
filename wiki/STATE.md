# DevDrops — Current State

> Last updated: 2026-04-17 (full rewrite against live repo state)

This file is rebuilt from the source tree, not from prior STATE.md content. All counts and claims below were verified against the repo at HEAD on 2026-04-17.

---

## Summary

37 pay-per-query products live on Base mainnet via x402. Stripe credit bundles available as a secondary payment rail for card users. MCP server published via `/.well-known/mcp/server-card.json` (Smithery format). CDP Bazaar discovery: not yet indexed — no successful USDC payment has been processed by the Coinbase facilitator, which is the gating condition for Bazaar inclusion.

---

## Product catalogue

37 products, organised by the taxonomy in `src/middleware/payment.ts` (which is the authoritative pricing map). Counting rule: unique path-prefix products excluding credit bundles; GET/POST variants of the same path count as one product; `inference/complete` and `inference/chat` count together.

**Compliance & Trust Infrastructure**
- `sanctions` — OFAC SDN + UN + UK HMT fuzzy match, $0.05
- `vat` — EU VIES + UK HMRC, $0.01
- `company` — UK Companies House enrichment (officers, PSCs, charges), $0.02
- `regulatory` — Companies House + SEC EDGAR change feeds, $0.01
- `tenders` — UK Contracts Finder + SAM.gov, $0.01

**UK & Global Public Data**
- `property` — planning, prices, zoning, $0.01
- `property-mcp` — property intelligence exposed as MCP tools, $0.01
- `location` — address intelligence (flood, crime, schools, transport), $0.02

**Financial & Market Data**
- `filings` — SEC + Companies House document retrieval, $0.01
- `calendar` — FOMC / earnings / IPO events, $0.005
- `stocks` — Yahoo Finance (10,000+ tickers), $0.005
- `predictions` — Polymarket + Manifold Markets, $0.005
- `odds` — The Odds API (sports), $0.005
- `crypto` — CoinCap (2,000+ tokens), $0.001

**AI-Enhanced Intelligence (Claude API)**
- `sentiment` — news sentiment analysis, $0.02
- `signals` — cross-market correlation signals, $0.05
- `documents` — contract and document summarisation (POST), $0.10
- `research` — AI research brief generator, $0.10
- `summarize` — URL summarisation, $0.02
- `classify` — custom/default category classification, $0.02
- `entities` — named entity recognition, $0.02
- `inference` — LLM text completion / multi-turn chat via Cloudflare Workers AI, $0.005
- `image` — AI image generation (Flux + SDXL) via Workers AI, $0.02

**Content & Research**
- `papers` — OpenAlex + Semantic Scholar, $0.005
- `extract` — URL content extraction (GET + POST), $0.005
- `translate` — MyMemory translation (70+ languages, POST), $0.005
- `domain` — WHOIS / DNS / SSL / tech stack, $0.005
- `email-verify` — MX + disposable-domain + format checks, $0.005
- `food` — Open Food Facts nutrition, $0.005

**Utilities**
- `weather` — OpenWeatherMap, $0.001
- `fx` — Frankfurter (ECB rates), $0.001
- `ip` — IPinfo.io geolocation, $0.001
- `history` — Wikipedia "On This Day", $0.001
- `qr` — QR code generator, $0.001
- `time` — timezones + public holidays, $0.001
- `utils` — hash / IBAN / base64 / UUID helpers, $0.001
- `asn` — BGPView ASN + BGP intelligence, $0.005
- `economy` — World Bank indicators (100+ metrics, 200+ countries), $0.005

**MCP Server**
- `mcp` — universal MCP server (18 tools via JSON-RPC), $0.01

---

## Infrastructure

| Component | Status | Notes |
|---|---|---|
| Cloudflare Workers | Live | Paid plan ($5/mo) |
| D1 Database | Live | `devdrops` DB, schema in `src/db/schema.sql` |
| KV Cache | Live | `CACHE` binding for hot data, tiered KV→D1 fallback in `src/lib/cache.ts` |
| R2 Storage | Pending | Cloudflare support ticket open; nightly backup cron skips gracefully when absent |
| Cloudflare Workers AI | Live | `AI` binding, used by `inference.ts` and `image.ts` |
| Cloudflare Email Routing | Live | `EMAIL` send_email binding — purchase notifications |
| `api.devdrops.run` | Live | Custom domain |
| `devdrops.run`, `www.devdrops.run` | Live | Zone route intercept |
| `workers.dev` exposure | Disabled as of 2026-04-17 | `workers_dev = false` in `wrangler.toml` |

---

## Dependencies

From `package.json`:

- `@x402/hono` ^2.3.0
- `@x402/extensions` ^2.9.0
- `@x402/evm` ^2.9.0
- `hono` ^4.7.0
- `jose` ^6.2.2 (EIP-3009 / Ed25519 signing)
- `mimetext` ^3.0.28 (email body construction)
- `stripe` ^22.0.0 (credit bundles)

Dev: `typescript` 5.8, `vitest` 4.1.3, `wrangler` 4.14, `@cloudflare/workers-types`.

---

## Secrets referenced in code

Confirmed by grep across `src/`. PC is responsible for ensuring each is set with `wrangler secret put` where marked required.

| Secret | Consumed by | Status |
|---|---|---|
| `CDP_API_KEY_ID` | `src/index.ts` x402 facilitator auth | Required |
| `CDP_API_KEY_SECRET` | `src/index.ts` x402 facilitator auth | Required |
| `ANTHROPIC_API_KEY` | sentiment, signals, documents, research, summarize, classify, entities | Required for Tier 3 AI products |
| `WEATHER_API_KEY` | weather | Required |
| `ODDS_API_KEY` | odds | Required |
| `COMPANIES_HOUSE_API_KEY` | regulatory, company, filings | Required |
| `SAM_GOV_API_KEY` | tenders (US federal) | Optional — endpoint returns 503 gracefully when unset |
| `FDC_API_KEY` | food (USDA FoodData Central) | Optional — endpoint returns 503 gracefully when unset |
| `STRIPE_SECRET_KEY` | checkout | Required for Stripe rail |
| `STRIPE_WEBHOOK_SECRET` | checkout webhook | Required for Stripe rail |
| `ADMIN_SECRET` | admin operations (sanctions list refresh, credits admin) | Required |
| `PAY_TO_ADDRESS` | x402 receive wallet | Set as `[vars]` in wrangler.toml, not a secret |

---

## Payment rails

**x402 USDC on Base mainnet — primary.**
- Facilitator: `https://api.cdp.coinbase.com/platform/v2/x402`
- Network: `eip155:8453` (Base mainnet)
- Pay-to address: `0xc42EAe553c5C2d521d8A0543c265480B380179D2`
- Ed25519 auth: new CDP portal issues 64-byte raw keys (seed || pubkey), handled in `src/lib/cdp-auth.ts`
- Free tier: first 5 requests/day/IP on specific endpoints (fx, crypto, ip, time, weather, qr, history, utils) served without payment — tracked in KV.
- Development bypass: `ENVIRONMENT=development` in `wrangler dev` skips payment middleware.

**Stripe credit bundles — secondary.**
- Bundles: $5 (500 queries), $25 (2,750 queries, 10% bonus), $100 (12,000 queries, 20% bonus)
- Webhook-processed (`/api/checkout/webhook`) with signature verification via `STRIPE_WEBHOOK_SECRET`
- Credits stored in D1; deducted per request by `src/lib/credits.ts`
- Email notifications on purchase via Cloudflare Email Routing

---

## Discovery surface

| Channel | Status | Location |
|---|---|---|
| `/.well-known/x402` | Live | manifest served from `src/routes/well-known.ts` |
| `/.well-known/mcp/server-card.json` | Live (Smithery format) | 37 products exposed as MCP tools |
| `/.well-known/mcp.json` | Live | generic MCP discovery |
| `/.well-known/ai-plugin.json` | Live | ChatGPT plugin manifest |
| `/.well-known/llms.txt` | Live | agent guidance file |
| `/openapi.json` | Live | OpenAPI 3.1 with x402 extensions |
| `/catalog` | Live | machine-readable product list |
| CDP Bazaar | **Not yet indexed** | Bazaar is seeded from facilitator-settled payments, not from 402 responses. No successful mainnet payment has been made against a DevDrops endpoint yet. Seeding is Brief 2 in the 07-correct-instructions.md follow-up (requires PC wallet — out of scope tonight). |
| `coinbase/x402#38` | **CLOSED without merge** | Last activity 2026-04-07. Reviewer did not act. Do not resubmit without a specific reason per Brief 8 guidance. |
| `xpaysh/awesome-x402#209` | Open but stagnant | Last activity 2026-04-07. Already has one self-bump; no second bump tonight (noise). |
| MCP registry (official) | Not yet submitted | `registry.modelcontextprotocol.io` submission flow check deferred to PC. |
| `x402scan.com` | Will auto-appear | after first mainnet settled payment. |

---

## CI / CD

- `.github/workflows/deploy.yml` — typecheck + smoke tests (non-blocking) on PRs, deploy to Cloudflare on push to `main`.
- `.github/workflows/healthcheck.yml` — every 4 hours, curls all endpoints and auto-opens GitHub issues for regressions.
- Wrangler cron triggers (inside the Worker):
  - `*/30 * * * *` — in-Worker health check
  - `0 2 * * *` — nightly D1→R2 backup (skips if R2 unavailable)

---

## Smoke tests

`src/test/smoke.test.ts` runs under vitest against live `api.devdrops.run`. Asserts on structural invariants only (status codes, JSON shape, required fields), never on live upstream data. Covers: landing, `/health`, `/catalog`, `/openapi.json`, `/.well-known/x402`, and one payment-gated 402 probe.

---

## Known issues and pending items

1. **R2 bucket** — Cloudflare support ticket open. Nightly backup cron written and deployed; skips gracefully until R2 is provisioned.
2. **MCP registry submission** — submission flow at `registry.modelcontextprotocol.io` has not been actioned. Low-effort follow-up for PC.
3. **Bazaar seed payment** — Brief 2 from `07-correct-instructions.md` requires PC wallet interaction. No successful USDC payment has been processed against DevDrops yet. Bazaar indexing is gated on this.
4. **coinbase/x402#38** — closed without merge; PR path for ecosystem inclusion appears dead. If DevDrops presence in the ecosystem doc is important, re-evaluate approach (new PR with different framing? open a GH issue and ask?).
5. **xpaysh/awesome-x402#209** — open, stagnant since 2026-04-07 self-bump. No further action tonight.
6. **GitHub repo "About" field** — still references an old product count. Requires manual PC update via GitHub UI (cannot be set via `gh api` without additional auth on the repo).

---

## Architecture decisions of note

- **Zone routes over custom_domain** for apex + www: `devdrops.run` has A records pointing to Cloudflare proxy IPs. Zone routes intercept at the proxy level without conflicting with existing DNS. `api.devdrops.run` uses `custom_domain = true` because it has no pre-existing records.
- **CDP facilitator (mainnet)** instead of x402.org: x402.org only supports testnet. Coinbase CDP is required for Base mainnet payment verification.
- **Ed25519 / EdDSA**: new CDP portal issues 64-byte raw Ed25519 keys (seed || pubkey), not P-256. `src/lib/cdp-auth.ts` handles the format explicitly.
- **`ENVIRONMENT=development` bypass**: allows `wrangler dev` testing without USDC.
- **R2 is optional**: `STORAGE: R2Bucket | undefined` in `types.ts`. Backup cron checks and skips. Nothing else depends on R2.
- **Payment middleware per-request**: Cloudflare Workers have no persistent startup state, so `paymentMiddlewareFromConfig` is called per-route.
- **Tiered cache**: `src/lib/cache.ts` prefers KV edge cache, falls back to D1 regional cache. TTL per-product.
- **Free tier counter in KV**: first 5 requests/day/IP on cheap endpoints served without 402. Counter keyed by `IP:endpoint:YYYY-MM-DD`, TTL 25h.
