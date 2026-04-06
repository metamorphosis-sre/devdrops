# DevDrops.run — Product Strategy & Build Plan (v2 — corrected)

## Platform Overview

DevDrops is a suite of paid data APIs hosted on Cloudflare Workers. Each product charges per-query via **both x402 and Stripe MPP** — the two dominant machine payment protocols. No API keys, no subscriptions — agents and developers pay per request and get instant access.

**Domain:** devdrops.run  
**Infrastructure:** Cloudflare Workers (Paid plan, $5/mo) + D1 + R2 + KV  
**Payment protocols:**  
- x402 (USDC on Base, Coinbase facilitator — free settlement)  
- Stripe MPP (stablecoins + fiat via Stripe PaymentIntents — standard Stripe fees)  
**Dev environment:** M4 Mac Mini + Claude Code + Claude Desktop + MCP servers  
**Revenue:** USDC direct to wallet (x402) + Stripe dashboard (MPP)  

### Why Both Protocols

This is the key insight from research: **x402 and MPP are not competing ecosystems — they're complementary, and you can serve both from the same endpoint.**

- Stripe explicitly supports both MPP and x402 in their machine payments docs. They have native x402 integration alongside MPP.
- MPP is backwards-compatible with x402 — MPP clients can consume existing x402 services without modification.
- Cloudflare Workers has official middleware for both protocols (Hono-compatible).
- Your Hono API endpoints can accept both payment types simultaneously — same code, same routes, dual payment middleware.
- x402 reaches crypto-native agents (wallets with USDC). MPP reaches traditional agents (credit cards, fiat, Stripe-connected).
- Together they cover the entire buyer universe. Agents with crypto wallets pay via x402. Agents with Stripe/fiat pay via MPP.

**Implementation:** Single Hono app with both `@x402/hono` middleware and MPP middleware on the same routes. The agent's payment method determines which protocol is used — your code doesn't need to care.

---

## Cloudflare Infrastructure — Corrected Limits

### Free Tier (prototyping only)
- Workers: 100,000 requests/day
- D1: **500 MB per database, 10 databases max, daily row read/write limits**
- R2: 10GB storage, 10M Class B reads/month
- KV: 100,000 reads/day

### Workers Paid Plan ($5/month) — RECOMMENDED from day one
- Workers: 10M requests/month included, then $0.30/million
- D1: **10 GB per database**, 50,000 databases, billed by rows read ($0.001/million) and written ($1.00/million)
- R2: 10GB free, then $0.015/GB/month
- KV: 1M reads/month included, then $0.50/million

**Recommendation:** Start on the $5/month paid plan immediately. The free tier's daily row limits will disrupt data collection cron jobs. $5/month gives you room to build and test all 13 products without hitting walls. Upgrade guidance for each growth milestone is in the Cost Projection section below.

---

## Product Suite — 13 Products

### TIER 1: Domain Expertise (Highest Margin)

#### 1. Global Property Intelligence API
- **What:** Structured JSON feed of property market signals — planning applications, price movements, comparable sales, zoning changes
- **Gap:** Zero real estate intelligence sold via x402 or MPP. Every existing service is crypto-native
- **Primary data sources:** UK Land Registry (open data, free API), Companies House (free API), local planning portals (scrape with Playwright)
- **Backup data sources:** Zoopla/Rightmove public listings (scrape), OpenStreetMap (open data), US Census/Zillow Research Data (free bulk downloads), Australian ABS data
- **Price:** $0.01–$0.05/query
- **Moat:** Your domain expertise structures and interprets raw data that generic scrapers can't

#### 2. Property MCP Server
- **What:** Same intelligence as #1, exposed as MCP tools that AI agents call natively
- **Gap:** No property-focused MCP server exists in the registry
- **Price:** $0.01–$0.03/tool call
- **Build note:** Single codebase, two interfaces (REST + MCP)

---

### TIER 2: Data Aggregation (Volume Play)

#### 3. Prediction Market Aggregator Feed
- **What:** Normalised odds from Polymarket, Kalshi, Manifold, PredictIt, Metaculus in one endpoint
- **Gap:** Polymarket acquired Dome (the only YC-backed cross-platform API) in early 2026. pmxt and Prediction Hunt are filling it but both are very early
- **Primary data sources:** Polymarket Gamma API (free, public read), Kalshi REST API (free for market data), Manifold API (free, open), Metaculus API (free for research)
- **Backup data sources:** PredictIt API (limited but free), Prediction Hunt API (aggregator, free tier), direct webscraping of market pages
- **Price:** $0.005–$0.02/query
- **Priority:** HIGH — time-sensitive gap
- **Risk note:** Polymarket Gamma API is public for reading but check ToS for redistribution limits. Kalshi API permits data access for non-commercial research — may need commercial agreement at scale

#### 4. Sports Betting Odds Normaliser
- **What:** Cross-bookmaker odds comparison via micropayments
- **Gap:** Existing odds APIs (OpticOdds $3k/mo, OddsJam, The Odds API) all use subscriptions. Zero x402/MPP-native sports odds endpoints exist
- **Primary data sources:** The Odds API (free tier: 500 requests/mo, paid: $35/mo for 10K), Smarkets API (free), Betfair Exchange API (free with account)
- **Backup data sources:** Pinnacle API (requires affiliate account), direct scraping of Oddschecker/OddsPortal, public bookmaker feeds
- **Price:** $0.005–$0.01/query
- **Risk note:** Odds API free tier is limited. Budget $35/month for their standard plan once live. Smarkets is UK-based and freely accessible

#### 5. Global Regulatory Intelligence Feed
- **What:** Structured changes from Companies House, SEC EDGAR, EU Official Journal, UK planning authorities, FCA notices
- **Gap:** No regulatory change feed in the x402/MPP ecosystem
- **Primary data sources:** Companies House streaming API (free, real-time filings), SEC EDGAR full-text search API (free), FCA register (free), EUR-Lex SPARQL endpoint (free, open data)
- **Backup data sources:** UK Legislation API (free), UK Planning Portal RSS feeds, OpenCorporates API (limited free tier)
- **Price:** $0.01–$0.10/query

#### 6. Financial Events Calendar API
- **What:** Earnings dates, central bank meetings (FOMC, ECB, BoE, BoJ), economic data releases, IPO dates
- **Gap:** No financial calendar endpoint via x402/MPP
- **Primary data sources:** Trading Economics calendar (scrape public pages), Federal Reserve schedule (public), ECB/BoE published calendars, Yahoo Finance earnings calendar (public)
- **Backup data sources:** Investing.com economic calendar (scrape), MarketWatch calendar, FMP API (free tier: 250 requests/day)
- **Price:** $0.005/query

#### 7. Company Filings & Ownership API
- **What:** Real-time filing alerts, beneficial ownership lookups, director change tracking
- **Gap:** Filings data is public but nobody serves it structured via micropayments
- **Primary data sources:** Companies House API (free, 600 requests/5 min), SEC EDGAR XBRL API (free, unlimited), OpenCorporates API (free tier: 200 requests/month)
- **Backup data sources:** Companies House bulk data downloads (free, monthly), SEC EDGAR bulk archives (free), EU Business Registers Interconnection System (BRIS, free)
- **Price:** $0.01–$0.05/query
- **Risk note:** Companies House API is robust and well-maintained. SEC EDGAR is rock-solid. Low data source risk

#### 8. Domain & Web Intelligence API
- **What:** WHOIS lookups, DNS records, SSL certificates, tech stack detection, domain age/history
- **Gap:** WHOIS/DNS APIs all require subscriptions. No micropayment option
- **Primary data sources:** RDAP protocol (free, replacing WHOIS — supported by all registries), DNS resolution via public resolvers, Certificate Transparency logs (crt.sh, free API), Wappalyzer open-source (tech stack detection, self-hosted)
- **Backup data sources:** WHOIS XML API (free tier: 500 lookups/month), SecurityTrails (free tier: 50 queries/month), BuiltWith (free tier limited)
- **Price:** $0.005–$0.02/query

---

### TIER 3: AI-Enhanced Intelligence (Premium)

#### 9. News Sentiment Analysis API
- **What:** Submit a ticker, company, or topic → structured sentiment scores from recent news
- **Primary data sources:** Google News RSS (free), NewsAPI.org (free tier: 100 requests/day, $449/mo for business), GNews API (free tier: 100 requests/day)
- **Backup data sources:** Bing News API (1000 free/month), direct RSS feeds from major outlets, Reddit API (free)
- **AI cost:** ~$0.005 per Claude API call for sentiment scoring
- **Price:** $0.02–$0.10/analysis (4–20x markup on AI cost)

#### 10. Cross-Market Signal Correlator
- **What:** Combine prediction market odds + sports odds + news sentiment + financial events into correlation signals
- **Gap:** Nobody offers cross-domain signal correlation as a unified feed
- **Dependency:** Requires products 3, 4, 6, 9 to be live
- **Price:** $0.05–$0.25/analysis

#### 11. Contract & Document Summariser API
- **What:** Submit a PDF/text → structured summary with key terms, risks, obligations
- **Primary method:** Accept document via POST, process via Claude API, return structured JSON
- **AI cost:** ~$0.01–$0.05 per document (varies by length)
- **Price:** $0.10–$0.50/document (3–10x markup)

#### 12. Address & Location Intelligence API
- **What:** Submit an address → enriched data: flood risk, crime stats, school ratings, transport, broadband, EPC
- **Primary data sources (UK):** Environment Agency flood risk API (free), Police.uk crime API (free), Ofsted API (free), Ofcom broadband data (free bulk download), EPC register (free API)
- **Primary data sources (US):** FEMA flood zones (free), FBI crime stats (free), GreatSchools API (free tier), FCC broadband map (free)
- **Backup data sources:** OpenStreetMap Nominatim (free geocoding), Overpass API (free), Google Maps Geocoding (free tier: 200/day)
- **Price:** $0.02–$0.10/lookup

#### 13. AI Research Brief Generator
- **What:** Submit a topic → structured research brief with key facts, recent developments, analysis
- **AI cost:** ~$0.02–$0.10 per brief (web search + Claude synthesis)
- **Price:** $0.10–$0.50/brief

---

## Dual-Protocol Payment Architecture

```
Agent/Developer sends HTTP request
         │
         ▼
   Cloudflare Worker (Hono)
         │
    ┌────┴────┐
    │ Route   │
    │ matched │
    └────┬────┘
         │
    ┌────┴────────────────┐
    │ Payment middleware   │
    │ checks for:         │
    │  1. x402 header     │
    │  2. MPP credential  │
    │  3. Neither → 402   │
    └────┬────────────────┘
         │
    ┌────┴────┐         ┌──────────┐
    │ x402    │         │ Stripe   │
    │ path    │         │ MPP path │
    │         │         │          │
    │ Coinbase│         │ Stripe   │
    │ facili- │         │ Payment- │
    │ tator   │         │ Intent   │
    │ (free)  │         │ (2.9%+   │
    │         │         │  $0.30)  │
    └────┬────┘         └────┬─────┘
         │                   │
         └───────┬───────────┘
                 │
           ┌─────┴─────┐
           │ Serve data │
           │ (same for  │
           │ both paths)│
           └────────────┘
```

### Why this matters commercially
- x402: free settlement (Coinbase facilitator covers gas). You keep 100% of the payment minus negligible on-chain fees
- MPP via Stripe: standard Stripe fees (2.9% + $0.30 for cards, lower for stablecoins). Higher fees but reaches agents that only have fiat/cards
- Both protocols serve the same data — you write your business logic once
- Stripe's x402 integration means agents paying via x402 can also settle through Stripe's dashboard if you want unified reporting

### Stripe MPP Limitation
- MPP currently requires early access signup from Stripe
- Only US businesses can accept stablecoin payments via Stripe (your UK entity can accept card payments via MPP, but for stablecoin MPP you'd need a US entity or wait for UK support)
- For now: x402 is your primary stablecoin rail, MPP is your fiat/card rail

---

## Infrastructure Architecture

```
devdrops.run (Cloudflare Pages)
├── Landing page / docs / product catalog
│
├── api.devdrops.run (Cloudflare Workers — $5/mo paid plan)
│   ├── Dual payment middleware (x402 + MPP)
│   ├── /property/*
│   ├── /predictions/*
│   ├── /odds/*
│   ├── /regulatory/*
│   ├── /calendar/*
│   ├── /filings/*
│   ├── /domain/*
│   ├── /sentiment/*
│   ├── /signals/*
│   ├── /documents/*
│   ├── /location/*
│   └── /research/*
│
├── Cloudflare D1 (10GB per database on paid plan)
│   ├── property_data
│   ├── predictions_cache
│   ├── odds_cache
│   ├── regulatory_changes
│   ├── calendar_events
│   └── filings_data
│
├── Cloudflare R2 (blob storage, zero egress fees)
│   ├── /backups/ (nightly D1 exports)
│   ├── /documents/ (uploaded docs for summarisation)
│   └── /historical/ (time-series archives)
│
└── Cloudflare KV (edge cache)
    └── Hot data: current odds, live prices, recent sentiment
```

### Data Collection Pipeline (Cron Triggers)

- **Every 5 min:** Prediction market prices (Polymarket Gamma, Kalshi), sports odds (The Odds API — within rate limits)
- **Every hour:** News sentiment scans (Google News RSS), regulatory feed checks (Companies House streaming API)
- **Daily:** Planning application scrapes (Playwright on Mac Mini → push to D1), financial calendar sync, Companies House bulk check
- **Weekly:** Property price index updates, full D1 → R2 backup, historical data archiving

### Backup & Redundancy Strategy

**Layer 1 — Automatic (Cloudflare built-in)**
- D1 has built-in Time Travel: point-in-time recovery to any minute within the last 30 days
- D1 automatically replicates across Cloudflare's network

**Layer 2 — Nightly (automated cron)**
- Scheduled Worker exports each D1 table as JSON → R2 bucket
- R2 provides 99.999999999% (eleven 9s) durability

**Layer 3 — Monthly (manual)**
- Pull R2 backups to Mac Mini local storage via `wrangler r2 object get`
- Store on external drive as offline backup

**Layer 4 — Data source redundancy**
- Every product has primary AND backup data sources listed above
- If a primary source goes down or changes terms, switch to backup within the same cron job
- All government open data sources (Companies House, SEC EDGAR, Land Registry, Environment Agency) are legally guaranteed to remain free and open

---

## Cost Projection — Corrected

### Phase 1: Build & Launch (Month 1-2)
- Cloudflare Workers Paid: $5/month
- The Odds API (if using sports product): $0 (free tier) → $35/month when live
- Claude API (for sentiment/summariser products): ~$5-10/month at low volume
- **Total: ~$10-50/month**

### Phase 2: Early Traction (Month 3-6)
- ~1,000 paid queries/day across all products
- Revenue: ~$10-30/day = $300-900/month
- Cloudflare costs: ~$10-15/month
- Data source subscriptions: ~$50-100/month
- Claude API: ~$20-50/month
- **Net: $130-735/month profit**

### Phase 3: Growth (Month 6-12)
- ~10,000 paid queries/day
- Revenue: ~$100-300/day = $3,000-9,000/month
- Cloudflare costs: ~$20-30/month
- Data sources: ~$100-200/month
- Claude API: ~$100-200/month
- **Net: $2,670-8,570/month profit**

### When to Upgrade
- **Free → Paid ($5/mo):** Immediately. Don't build on free tier
- **D1 single database → multiple databases:** When any single database approaches 10GB
- **Add Stripe MPP:** When approved for early access (apply now, implement when approved)
- **Add dedicated data source subscriptions:** When free tier rate limits become the bottleneck (likely month 2-3)

---

## Mac Mini + Claude Ecosystem Workflow

### Development Stack
- **Claude Code** (terminal): Primary development tool. Write Workers, test with Wrangler, deploy to Cloudflare
- **Claude Desktop**: Research, planning, data structuring, document analysis
- **Claude.ai (web)**: Strategic planning, complex research (this conversation)

### MCP Servers to Install
1. **GitHub MCP** — PR management, code deployment workflows
2. **Filesystem MCP** — local file access for data processing
3. **SQLite MCP** — local D1 development/testing
4. **Playwright MCP** — automated data collection from planning portals, regulatory sites
5. **Cloudflare Wrangler** — deploy Workers directly from Claude Code terminal

### Claude Code Skills (.claude/ files)
- `deploy.md` — "When I say deploy [product], run wrangler deploy for that Worker, then test the x402 endpoint, then test the MPP endpoint"
- `collect-data.md` — "When I say collect [source], run the scraping/API workflow for that data source and insert into D1"
- `backup.md` — "When I say backup, export all D1 databases to R2 and log completion"
- `monitor.md` — "When I say status, check all data source APIs for availability and report any failures"

### Development Workflow
1. Claude Code writes the Worker function locally
2. Test with `wrangler dev` (local Cloudflare simulator)
3. Test x402 flow on Base Sepolia testnet (free test USDC from Circle faucet)
4. Test MPP flow with Stripe test mode
5. Deploy to production: `wrangler deploy`
6. Register in x402 Bazaar for agent discovery (set `discoverable: true` in middleware config)
7. Register in Stripe's MPP service directory
8. Monitor via Cloudflare dashboard + Stripe dashboard

---

## Legal & Risk Summary

### Legal (UK-based sole trader or Ltd)
- **Selling data via API:** Legal. No FCA authorisation needed — selling data, not financial advice
- **Receiving USDC (x402):** Legal in UK. Declare as income via self-assessment. Convert to GBP at point of receipt for tax
- **Receiving fiat (MPP via Stripe):** Standard Stripe merchant account. Stripe handles VAT/tax reporting
- **Data sourcing:** All primary sources are government open data or APIs with explicit commercial-use terms. Backup sources may have ToS restrictions — check before activating
- **GDPR:** Products serve structured data about properties, markets, and public filings — not personal data. Companies House director names are public registry data (lawful basis: public task). Exclude any personal data from scraping
- **Stripe MPP US-only limitation for stablecoins:** UK entity can accept card payments via MPP. For stablecoin MPP, you'd need US entity or wait for UK rollout
- **Recommendation:** One-hour consultation with crypto-literate accountant once revenue exceeds ~£1,000/month. Register as sole trader initially; incorporate Ltd when revenue justifies it

### Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Low x402/MPP buyer demand in first 6 months | High | Medium | 13-product portfolio diversifies; near-zero infrastructure cost limits downside |
| Primary data source changes terms | Medium | High | Every product has backup sources; government open data is legally protected |
| Cloudflare outage | Low | High | Hono code is portable to Vercel/Deno/Bun; R2 backups enable migration |
| x402 protocol loses to competitor | Low | Medium | MPP support provides hedge; underlying data APIs are valuable via any payment method |
| USDC depeg event | Very Low | High | Convert USDC to GBP regularly; don't hold large USDC balances |
| Stripe MPP access delayed | Medium | Low | x402 is primary; MPP is additive reach |
| UK crypto regulation changes | Medium | Medium | Monitor FCA announcements; receiving USDC for data services is low regulatory risk |
| Rate limiting on free data sources | High | Medium | Budget for paid tiers of data sources ($35-200/month) |

---

## Build Priority Order

1. **Landing page** (devdrops.run on Cloudflare Pages)
2. **Prediction Market Feed** (#3) — time-sensitive Dome gap, clean public APIs
3. **Financial Events Calendar** (#6) — simplest to build, clean open data
4. **Company Filings API** (#7) — Companies House + SEC EDGAR are rock-solid free APIs
5. **Property Intelligence API** (#1) — your deepest expertise
6. **Domain Intelligence** (#8) — RDAP/DNS are free and fast to build
7. **Sports Odds Normaliser** (#4) — volume play, needs $35/mo data subscription
8. **Address/Location Intelligence** (#12) — aggregation of free government APIs
9. **Regulatory Feed** (#5) — high value per query
10. **News Sentiment** (#9) — requires Claude API costs, implement once revenue covers it
11. **Document Summariser** (#11) — requires Claude API costs
12. **Property MCP Server** (#2) — same data as #1, different interface
13. **Cross-Market Correlator** (#10) — depends on other products being live
14. **Research Brief Generator** (#13) — highest cost, build last
