# DevDrops — Current State

> Last updated: 2026-05-06

---

## Summary

DevDrops launched from an earlier 25/30-module plan. The current production catalog reports **43 products/endpoints** and is now the source of truth. Live metadata surfaces are:

- `/catalog` — 43 products
- `/openapi.json` — OpenAPI 3.1 with 43-product positioning
- `/.well-known/x402` — x402 discovery manifest
- `/.well-known/mcp.json` and `/.well-known/mcp/server-card.json` — MCP discovery

Older 25/30 wording is superseded by the current catalog and the production audit docs.

---

## Live Modules

See `docs/devdrops-endpoint-matrix.md` for the current 43-product matrix.

## Original 30-Module Baseline

### Tier 1 — Domain Expertise

#### 1. Property Intelligence
- **Endpoint:** `GET /api/property/*`
- **Price:** $0.01 per query
- **Data source:** Proprietary (address lookup, valuation signals, comparable sales)
- **Why kept:** High-value, AI-agent-friendly. No fragile upstream dependency — logic is self-contained.
- **Notes:** Includes sub-routes: `/api/property/valuation`, `/api/property/comparables`, `/api/property/history`

#### 2. Property MCP Server
- **Endpoint:** `GET /api/property/mcp/*`
- **Price:** $0.01 per query
- **Data source:** Same as Property Intelligence
- **Why kept:** Exposes property data via Model Context Protocol (MCP) for Claude and other AI agents. Differentiator in the x402 ecosystem.
- **Notes:** MCP manifest file not yet published to registry (pending — low priority)

#### 3. Address Intelligence
- **Endpoint:** `GET /api/location/*`
- **Price:** $0.02 per query
- **Data source:** Geocoding + enrichment (structured address parsing, timezone, county/region data)
- **Why kept:** Foundational utility for any agent handling physical addresses.

---

### Tier 2 — Data Aggregation

#### 4. Prediction Markets
- **Endpoint:** `GET /api/predictions/*`
- **Price:** $0.005 per query
- **Data sources:** Polymarket + Manifold Markets
- **Why kept:** High agent interest — LLMs querying real-time market probabilities. Both sources are free, no key required.

#### 5. Sports Odds
- **Endpoint:** `GET /api/odds/*`
- **Price:** $0.005 per query
- **Data source:** The Odds API (Standard plan — $35/mo)
- **Why kept:** Reliable, structured, covers major leagues globally. Requires `ODDS_API_KEY`.
- **Notes:** Only paid upstream dependency (besides Claude API). Worth it for data quality.

#### 6. Regulatory Intelligence
- **Endpoint:** `GET /api/regulatory/*`
- **Price:** $0.01 per query
- **Data sources:** UK Companies House API + SEC EDGAR (US)
- **Why kept:** Dual-jurisdiction coverage. Companies House requires `COMPANIES_HOUSE_API_KEY`; EDGAR is free.

#### 7. Company Filings
- **Endpoint:** `GET /api/filings/*`
- **Price:** $0.01 per query
- **Data sources:** SEC EDGAR + Companies House (same as above, different endpoints)
- **Why kept:** Complements regulatory intelligence. Distinct product — focuses on document retrieval rather than entity status.

#### 8. Financial Calendar
- **Endpoint:** `GET /api/calendar/*`
- **Price:** $0.005 per query
- **Data source:** Trading Economics (public page scrape)
- **Why kept:** No free API alternative for earnings/economic events. Scrape is stable.
- **Notes:** Scrape-dependent — monitor if Trading Economics changes their markup.

#### 9. Domain Intelligence
- **Endpoint:** `GET /api/domain/*`
- **Price:** $0.005 per query
- **Data sources:** RDAP (IANA), DNS lookups, crt.sh (certificate transparency)
- **Why kept:** Fully self-contained, no API keys. High utility for security/diligence agents.

#### 10. Weather Data
- **Endpoint:** `GET /api/weather/*`
- **Price:** $0.001 per query
- **Data source:** OpenWeatherMap (free tier)
- **Why kept:** Cheapest product, high volume potential. Requires `WEATHER_API_KEY`.

#### 11. FX Rates
- **Endpoint:** `GET /api/fx/*`
- **Price:** $0.001 per query
- **Data source:** Frankfurter (ECB — European Central Bank data, free, no key)
- **Why kept:** Zero cost upstream, very stable. Covers 30+ currencies.

#### 12. IP Geolocation
- **Endpoint:** `GET /api/ip/*`
- **Price:** $0.001 per query
- **Data source:** IPinfo.io (free tier — 50k requests/mo)
- **Why kept:** Free, reliable, commercial-use license.
- **Notes:** Originally used ip-api.com — switched to IPinfo.io because ip-api.com's free tier explicitly prohibits commercial use.

#### 13. Historical Events
- **Endpoint:** `GET /api/history/*`
- **Price:** $0.001 per query
- **Data source:** Wikipedia "On This Day" API
- **Why kept:** Free, fun, useful for date-contextual agents. Zero cost.

#### 14. Academic Papers
- **Endpoint:** `GET /api/papers/*`
- **Price:** $0.005 per query
- **Data sources:** OpenAlex + Semantic Scholar
- **Why kept:** Both are free, open-access. High value for research agents.

#### 15. Food & Nutrition
- **Endpoint:** `GET /api/food/*`
- **Price:** $0.005 per query
- **Data source:** Open Food Facts (free, open database)
- **Why kept:** No upstream cost. Useful for health/diet agents.

#### 16. Public Tenders
- **Endpoint:** `GET /api/tenders/*`
- **Price:** $0.01 per query
- **Data sources:** UK Contracts Finder + SAM.gov (US federal procurement)
- **Why kept:** Dual-jurisdiction, both APIs are free. Strong enterprise agent use case.

#### 17. Email Verification
- **Endpoint:** `GET /api/email-verify/*`
- **Price:** $0.005 per query
- **Data source:** Self-contained DNS MX record lookups (no upstream)
- **Why kept:** Zero dependency on external API. Checks MX records, disposable domains, format validity.

#### 18. Text Translation
- **Endpoint:** `POST /api/translate/*`
- **Price:** $0.005 per query
- **Data source:** LibreTranslate (open-source, self-hosted friendly)
- **Why kept:** Free, no key required for public instances. Useful baseline translation.

---

### Tier 3 — AI-Enhanced (Claude API)

All four products in this tier call the Anthropic Claude API (`claude-opus-4-6` or similar) to enrich or synthesise raw data. They carry higher prices to cover API cost.

#### 19. News Sentiment
- **Endpoint:** `GET /api/sentiment/*`
- **Price:** $0.02 per query
- **Data source:** News RSS feeds + Claude API analysis
- **Why kept:** AI-powered sentiment across multiple news sources. Differentiator vs raw data.

#### 20. Cross-Market Signals
- **Endpoint:** `GET /api/signals/*`
- **Price:** $0.05 per query
- **Data source:** Multiple market feeds + Claude API synthesis
- **Why kept:** Highest-complexity product. Aggregates FX, crypto, equities, prediction markets → structured signal.

#### 21. Document Summariser
- **Endpoint:** `POST /api/documents/*`
- **Price:** $0.10 per query
- **Data source:** User-submitted document + Claude API
- **Why kept:** Highest price point. Universal utility — any document type.

#### 22. Research Brief
- **Endpoint:** `GET /api/research/*`
- **Price:** $0.10 per query
- **Data source:** Multi-source fetch + Claude API synthesis
- **Why kept:** Premium product. Produces structured research briefs on any topic. Best showcase for AI agent capabilities.

---

### Tier 4 — Expanded Utility & Intelligence (8 new modules)

#### 23. QR Code Generator
- **Endpoint:** `GET /api/qr/*`
- **Price:** $0.001 per query
- **Data source:** qrserver.com (free, no key)
- **Why kept:** Zero upstream cost. Universal utility — payment links, contact cards, tickets.

#### 24. Crypto Prices
- **Endpoint:** `GET /api/crypto/*`
- **Price:** $0.001 per query
- **Data source:** CoinCap API (free, no key)
- **Why kept:** Core x402 audience is crypto-native. 2000+ tokens, market data, exchange markets, historical OHLCV.

#### 25. Timezone & Holidays
- **Endpoint:** `GET /api/time/*`
- **Price:** $0.001 per query
- **Data source:** JS Intl API + Nager.Date (free, 100+ countries)
- **Why kept:** Zero upstream cost. Scheduling agents, outreach tools, meeting planners.

#### 26. VAT Verification
- **Endpoint:** `GET /api/vat/*`
- **Price:** $0.01 per query
- **Data source:** EU VIES REST API + UK HMRC (both free, no key)
- **Why kept:** Zero cost. B2B invoicing agents, KYB compliance, e-commerce. Covers all EU member states + UK.

#### 27. Stock Prices
- **Endpoint:** `GET /api/stocks/*`
- **Price:** $0.005 per query
- **Data source:** Yahoo Finance unofficial API (free, no key)
- **Why kept:** Was the first Bazaar listing (proven demand). 10,000+ tickers, history, search, movers.
- **Notes:** Add "Not financial advice" disclaimer. Yahoo Finance unofficial — use as-is, fallback if needed.

#### 28. URL Content Extractor
- **Endpoint:** `GET /api/extract/*`
- **Price:** $0.005 per query
- **Data source:** Self-contained fetch + HTML parsing (no upstream)
- **Why kept:** Confirmed top-4 x402 demand category. Clean text, title, author, publish date, metadata from any URL.

#### 29. Sanctions Screening
- **Endpoint:** `GET /api/sanctions/*`
- **Price:** $0.05 per query
- **Data source:** OFAC SDN, UN Security Council, UK HMT (all free government lists)
- **Why kept:** Highest per-query price outside AI tier. Enterprise compliance demand. No x402 alternative exists.
- **Notes:** Fuzzy name matching with configurable threshold. Lists refreshed via cron.

#### 30. Company Enrichment
- **Endpoint:** `GET /api/company/*`
- **Price:** $0.02 per query
- **Data source:** UK Companies House (free, requires API key)
- **Why kept:** Full company profile: officers, PSCs, charges, filings. Search by name, lookup by number, enrich from domain.

---

### Tier 5 — Network & Macro Intelligence (new)

#### 31. ASN & BGP Intelligence
- **Endpoint:** `GET /api/asn/*`
- **Price:** $0.005 per query
- **Data source:** BGPView (free, no key)
- **Why kept:** Zero upstream cost. Security agents, fraud detection, network analysis. IP→ASN, ASN details, peer relationships.

#### 32. World Bank Economic Indicators
- **Endpoint:** `GET /api/economy/*`
- **Price:** $0.005 per query
- **Data source:** World Bank Open Data API (free, no key, CC BY 4.0)
- **Why kept:** Zero upstream cost. Research agents, financial analysis, due diligence. GDP, inflation, unemployment, 100+ indicators, 200+ countries.

---

## Dropped Modules (3)

### Flights

- **Original endpoint:** `GET /api/flights/*`
- **Original source:** Amadeus Travel API
- **Replacement attempted:** Kiwi.com Tequila API
- **Why dropped:**
  - Amadeus has closed new signups indefinitely — cannot obtain API credentials.
  - Kiwi Tequila requires a manual approval form with no timeline for access.
  - No viable free/instant-access flight search API exists as of April 2026.
- **Decision:** Drop entirely rather than ship a permanently broken or stub endpoint.

### Jobs / Job Search

- **Original endpoint:** `GET /api/jobs/*`
- **Original source:** Adzuna Jobs API
- **Replacement attempted:** JSearch via RapidAPI
- **Why dropped:**
  - Adzuna offers only a 14-day commercial trial — not viable for a pay-per-query product.
  - JSearch is a RapidAPI-hosted product: creates a third-party intermediary layer, adds latency, and conflicts with DevDrops' "no API key" positioning.
  - The RapidAPI dependency makes this a poor fit architecturally.
- **Decision:** Drop entirely. The ecosystem doesn't have a clean free/open jobs API.

### Shipping Rate Lookup

- **Original endpoint:** `GET /api/shipping/*`
- **Original source:** EasyPost API
- **Why dropped:**
  - EasyPost requires a paid plan for multi-carrier rate queries (no meaningful free tier).
  - Shippo has the same constraint.
  - FedEx, UPS, USPS direct APIs require business accounts and complex auth.
  - No viable multi-carrier shipping rate API exists with free/instant access.
- **Decision:** Drop entirely. Shipping is a complex domain requiring carrier relationships — not viable for a zero-friction API product.

---

## Infrastructure Status

| Component | Status | Notes |
|---|---|---|
| Cloudflare Workers | Live | Paid plan ($5/mo) |
| D1 Database | Live | All 5 tables created, seeds applied |
| KV Cache | Live | Edge cache for hot data |
| R2 Storage | Pending | Cloudflare support ticket open — nightly backup cron skips gracefully if absent |
| `api.devdrops.run` | Live | Custom domain via `custom_domain = true` |
| `devdrops.run` | Live | Zone route intercept (A records blocked `custom_domain`) |
| `www.devdrops.run` | Live | Zone route intercept |

---

## Secrets Status

| Secret | Status |
|---|---|
| `CDP_API_KEY_ID` | Set |
| `CDP_API_KEY_SECRET` | Set |
| `ANTHROPIC_API_KEY` | Set |
| `WEATHER_API_KEY` | Set |
| `ODDS_API_KEY` | Set |
| `COMPANIES_HOUSE_API_KEY` | Set |

No secrets are missing for any live module.

---

## Discovery & Distribution Status

| Channel | Status |
|---|---|
| `/.well-known/x402` manifest | Live — `api.devdrops.run/.well-known/x402` |
| `/openapi.json` | Live — OpenAPI 3.1 with x402 extensions |
| `/catalog` | Live — machine-readable product list |
| coinbase/x402 Bazaar | PR open: coinbase/x402#38 |
| xpaysh/awesome-x402 | PR open: xpaysh/awesome-x402#209 |
| x402scan.com | Auto-appears after first paid transaction |
| Bankr x402 Cloud | Skipped — requires re-hosting on their infrastructure |
| MCP registry | Pending — Property MCP manifest not yet published |

---

## Cost Baseline

| Item | Cost | Frequency |
|---|---|---|
| Cloudflare Workers Paid | $5 | Monthly |
| The Odds API Standard | $35 | Monthly |
| Claude API (Tier 3 products) | ~$5–50 | Variable (usage-based) |
| devdrops.run domain | ~£10 | Annual |
| **Total fixed** | **~$40/mo** | Excluding Claude API variable cost |

---

## Known Issues / Pending

1. **R2 bucket** — Cloudflare support ticket open. Nightly backup cron is written and deployed but skips with a log entry until R2 is provisioned.
2. **Property MCP manifest** — MCP server route is live but the manifest file for the MCP registry hasn't been published.
3. **Bazaar PR** — coinbase/x402#38 awaiting review.
4. **awesome-x402 PR** — xpaysh/awesome-x402#209 awaiting review.
5. **ip-api.com → IPinfo.io migration** — Complete. IPinfo.io free tier allows 50k/mo commercial use; ip-api.com does not.

---

## Architecture Decisions of Note

- **Zone routes over `custom_domain`** — `devdrops.run` has A records pointing to Cloudflare proxy IPs (104.21.33.235 / 172.67.193.161). Adding a `custom_domain` binding conflicts with existing records. Zone route (`{ pattern = "devdrops.run/*", zone_name = "devdrops.run" }`) intercepts at the proxy level without touching DNS.
- **CDP facilitator (mainnet)** — x402.org only supports testnet. Coinbase CDP is required for Base mainnet payment verification.
- **Ed25519 / EdDSA** — New CDP portal issues 64-byte raw Ed25519 keys (seed || pubkey), not P-256. `cdp-auth.ts` handles the format explicitly.
- **`ENVIRONMENT=development` bypasses payment** — Allows `wrangler dev` testing without USDC.
- **R2 is optional** — `STORAGE: R2Bucket | undefined` in `types.ts`. Backup cron checks and skips if absent. Nothing else depends on R2.
- **Payment middleware is per-request** — Cloudflare Workers have no persistent startup state, so `paymentMiddlewareFromConfig` is called per-route registration.
