# DevDrops.run — Expanded Product List & Discovery Strategy (Addendum to v2)

## Expanded Product Suite — 25 Products

### EXISTING PRODUCTS (1-13) — see v2 strategy doc

---

### NEW PRODUCTS (14-25) — Researched Gaps

#### 14. Weather Data API
- **What:** Current conditions, forecasts, severe weather alerts by location
- **Gap confirmed:** Weather is mentioned in Coinbase's own Bazaar examples as a use case, yet no dedicated weather x402 endpoint exists in the ecosystem. The Bazaar documentation literally uses weather as its example schema — meaning agents are looking for it
- **Primary sources:** Open-Meteo API (completely free, no key needed, 10,000 requests/day), UK Met Office DataHub (free tier)
- **Backup sources:** OpenWeather (free tier: 1,000 calls/day), Visual Crossing (free tier: 1,000/day), WeatherAPI.com (free tier: 1M calls/month)
- **Price:** $0.001–$0.005/query (high volume, low price)
- **Build effort:** Very low — wrapper around Open-Meteo with caching

#### 15. Currency & FX Rates API
- **What:** Real-time and historical exchange rates for 170+ currencies including crypto
- **Gap:** Trading agents, e-commerce agents, and financial tools need FX rates constantly. No x402 endpoint exists
- **Primary sources:** European Central Bank reference rates (free, daily XML), Frankfurter API (free, open-source, based on ECB data)
- **Backup sources:** ExchangeRate-API (free tier: 1,500/month), Open Exchange Rates (free tier: 1,000/month), CoinGecko (free tier for crypto)
- **Price:** $0.001–$0.005/query
- **Build effort:** Very low

#### 16. Email Verification API
- **What:** Validate email addresses — syntax check, MX record verification, disposable email detection, SMTP verification
- **Gap:** Explicitly identified as a gap by ecosystem analysis — "company lookup, email verification" listed as underserved data enrichment categories. No x402 endpoint
- **Primary sources:** Self-built — DNS MX record lookups (free), disposable email domain lists (open-source on GitHub), SMTP handshake verification (free, just requires outbound connections)
- **Backup sources:** AbstractAPI email validation (free tier: 100/month), ZeroBounce (free tier: 100/month)
- **Price:** $0.005–$0.01/verification
- **Build note:** This requires outbound SMTP connections — may need a lightweight companion service outside Cloudflare Workers (Workers can do DNS but not raw SMTP). Consider Hetzner micro-instance for SMTP checks, or limit to syntax + MX + disposable detection which Workers handles natively

#### 17. IP Geolocation API
- **What:** Submit an IP address → get country, city, ISP, timezone, proxy/VPN detection
- **Gap:** IP geolocation is a common agent need (security tools, personalisation, analytics). No x402 endpoint
- **Primary sources:** ip-api.com (free for non-commercial, 45 requests/min), DB-IP (free lite database download, updated monthly)
- **Backup sources:** IPinfo.io (free tier: 50K/month), MaxMind GeoLite2 (free database download with registration)
- **Price:** $0.001–$0.005/lookup
- **Build effort:** Very low — download GeoLite2 database into D1, serve from edge

#### 18. Flight & Travel Price Search API
- **What:** Search flight prices between airports, hotel availability, route information
- **Gap:** Travel planning is one of the most common AI agent use cases. Agents currently need Amadeus API keys (free tier: 2,000 calls/month) or SerpApi subscriptions. No x402 endpoint wraps travel search
- **Primary sources:** Amadeus Self-Service API (free tier: 2,000 calls/month, requires registration), Kiwi.com Tequila API (free tier with registration)
- **Backup sources:** Skyscanner via RapidAPI (limited free tier), Google Flights scraping via SerpApi (paid)
- **Price:** $0.01–$0.05/search (higher price reflects upstream API costs)
- **Build effort:** Medium — requires managing upstream API credentials and rate limits
- **Risk note:** Amadeus free tier is generous for testing but may need paid plan ($499/month) at scale. Start with free tier, upgrade when x402 revenue justifies it

#### 19. Translation API
- **What:** Text translation between 100+ languages, language detection
- **Gap:** Cross-language agents are increasingly common. Translation APIs all require subscriptions or API keys. No x402 endpoint
- **Primary sources:** LibreTranslate (free, open-source, self-hostable), Lingva Translate (free, open-source proxy for Google Translate)
- **Backup sources:** MyMemory API (free tier: 5,000 words/day), DeepL API (free tier: 500K chars/month)
- **Price:** $0.005–$0.02/translation (depends on length)
- **Build effort:** Low if using LibreTranslate hosted instance; medium if self-hosting

#### 20. Job Market & Salary Data API
- **What:** Job postings by role/location, salary ranges, hiring trends, skills demand data
- **Gap:** HR agents, recruitment tools, and career advice agents need labour market data. No x402 endpoint
- **Primary sources:** Adzuna API (free tier: 250/month, covers 16 countries), Reed.co.uk API (free with registration, UK jobs)
- **Backup sources:** Indeed scraping (risky — ToS restrictions), USAJobs API (free, US government jobs), ONS labour market data (free, UK bulk data)
- **Price:** $0.01–$0.05/query
- **Build effort:** Medium

#### 21. Academic Paper Search API
- **What:** Search academic papers by topic, return abstracts, authors, citations, DOIs, open access links
- **Gap:** Research agents need this constantly. Existing APIs (Semantic Scholar, OpenAlex) require registration. No x402 endpoint aggregates them
- **Primary sources:** OpenAlex API (completely free, no key needed, 100K/day), Semantic Scholar API (free, no key for basic access, 100 requests/sec)
- **Backup sources:** CORE API (free tier, open access papers), CrossRef API (free, DOI metadata), arXiv API (free, CS/physics/math papers)
- **Price:** $0.005–$0.02/search
- **Build effort:** Low — both primary sources are generous and well-documented

#### 22. Public Procurement & Tender API
- **What:** Government contract opportunities, tender notices, awarded contracts — UK, EU, US
- **Gap:** Sales agents, business development tools, and compliance agents need procurement data. Totally fragmented across government portals. No aggregated x402 endpoint
- **Primary sources:** UK Contracts Finder API (free, official UK government), TED (Tenders Electronic Daily) API (free, EU procurement), SAM.gov API (free, US federal contracts)
- **Backup sources:** OpenOpps (aggregator), Find a Tender (UK replacement for TED post-Brexit)
- **Price:** $0.01–$0.05/query
- **Build effort:** Medium — three different API formats to normalise

#### 23. Shipping & Logistics Rate API
- **What:** Estimated shipping rates between locations, carrier comparison, delivery time estimates
- **Gap:** E-commerce agents and logistics tools need shipping rates. No x402 endpoint
- **Primary sources:** EasyPost API (free tier: 120K shipments/year), Shippo API (free tier, label generation + rate comparison)
- **Backup sources:** Royal Mail API (free with business account, UK), USPS Web Tools (free, US), ParcelMonkey API
- **Price:** $0.01–$0.03/rate lookup
- **Build effort:** Medium

#### 24. Nutrition & Food Data API
- **What:** Nutritional information by food item, recipe ingredient lookup, allergen data, calorie calculations
- **Gap:** Health agents, diet planning tools, and cooking agents need structured food data. No x402 endpoint
- **Primary sources:** Open Food Facts API (completely free, open-source, 3M+ products), USDA FoodData Central API (free, no key needed)
- **Backup sources:** Nutritionix API (free tier: 200/day), Edamam API (free tier: 100/day)
- **Price:** $0.005–$0.01/lookup
- **Build effort:** Low — both primary sources are excellent

#### 25. Historical Events & "On This Day" API
- **What:** Historical events, births, deaths by date. Cultural and historical context for content agents
- **Gap:** Content creation agents, social media agents, and educational tools need this. No x402 endpoint
- **Primary sources:** Wikipedia "On This Day" (free, public API), Wikidata SPARQL endpoint (free)
- **Backup sources:** This Day in History APIs on RapidAPI (various free tiers), manual curation from public domain historical databases
- **Price:** $0.001–$0.005/query
- **Build effort:** Very low

---

## Product Priority Matrix (All 25)

### Phase 1 — Launch sprint (Week 1-2, Mac Mini arrives)
Build the simplest, lowest-risk products first to establish presence in the ecosystem.

| # | Product | Build effort | Data risk | Revenue potential |
|---|---------|-------------|-----------|-------------------|
| 14 | Weather data | Very low | Very low (Open-Meteo is free/open) | High volume |
| 15 | Currency/FX rates | Very low | Very low (ECB is free/open) | High volume |
| 6 | Financial calendar | Low | Low | Medium |
| 25 | Historical events | Very low | Very low (Wikipedia) | Low but steady |
| 17 | IP geolocation | Very low | Very low (GeoLite2 free DB) | High volume |

### Phase 2 — Core products (Week 3-4)
Products with real competitive advantage or time-sensitive gaps.

| # | Product | Build effort | Data risk | Revenue potential |
|---|---------|-------------|-----------|-------------------|
| 3 | Prediction market feed | Low | Medium (check ToS) | High — Dome gap |
| 7 | Company filings | Low | Very low (govt APIs) | Medium |
| 8 | Domain intelligence | Low | Very low (RDAP/DNS free) | Medium |
| 21 | Academic paper search | Low | Very low (OpenAlex free) | Medium |
| 24 | Nutrition/food data | Low | Very low (Open Food Facts) | Medium |

### Phase 3 — Expertise products (Week 5-8)
Products that leverage your property knowledge or need more data work.

| # | Product | Build effort | Data risk | Revenue potential |
|---|---------|-------------|-----------|-------------------|
| 1 | Property intelligence | Medium | Low (UK open data) | High — your moat |
| 12 | Address/location intelligence | Medium | Low (govt APIs) | High |
| 5 | Regulatory feed | Medium | Low (govt APIs) | High per query |
| 22 | Public procurement | Medium | Low (govt APIs) | Medium |
| 4 | Sports odds | Medium | Medium (ToS dependent) | High volume |

### Phase 4 — Premium products (Month 2-3)
Products with AI costs that should launch once revenue covers expenses.

| # | Product | Build effort | Data risk | Revenue potential |
|---|---------|-------------|-----------|-------------------|
| 9 | News sentiment | Medium | Medium | Medium |
| 11 | Document summariser | Medium | Low | High per query |
| 13 | Research brief generator | Medium | Low | High per query |
| 10 | Cross-market correlator | High | Low (uses own products) | Premium |

### Phase 5 — Expansion (Month 3+)
Products that need upstream API subscriptions or more infrastructure.

| # | Product | Build effort | Data risk | Revenue potential |
|---|---------|-------------|-----------|-------------------|
| 18 | Flight/travel search | Medium | Medium (Amadeus ToS) | High |
| 20 | Job market data | Medium | Medium | Medium |
| 19 | Translation | Medium | Low (LibreTranslate) | Medium |
| 16 | Email verification | Medium | Low | High volume |
| 23 | Shipping rates | Medium | Medium | Medium |
| 2 | Property MCP server | Low (reuses #1) | Low | Medium |

---

## Discovery & Marketing Strategy — How to Get Found

### Tier 1: Machine Discovery (agents find you automatically)

These channels put your endpoints directly in front of AI agents — no human marketing needed.

1. **x402 Bazaar (Coinbase CDP facilitator)**
   - Automatic listing when you use the CDP facilitator with `discoverable: true`
   - Include rich metadata: input/output schemas, descriptions, pricing
   - This is the primary discovery channel — agents query this to find services
   - FREE

2. **x402 Bazaar on SKALE**
   - Separate marketplace with 70+ services, 9 integrations (Claude, Cursor, ChatGPT, LangChain, Telegram, n8n, Auto-GPT)
   - 95/5 revenue split in favour of providers
   - Submit your endpoints for listing

3. **Bankr x402 Cloud marketplace**
   - Every Bankr-deployed endpoint is auto-indexed in their discovery layer
   - Alternative deployment path for some products

4. **Stripe MPP service directory**
   - When approved for MPP, your endpoints appear in Stripe's machine payments directory
   - Over 100 services at launch — still small enough to stand out

5. **MCP server registries**
   - Register your Property MCP Server (product #2) in the official MCP registry
   - Claude Code users discover MCP servers through `claude mcp add` — direct integration

6. **x402scan.com**
   - Ecosystem explorer that indexes all x402 transactions, sellers, and resources
   - Your endpoints appear here automatically once they process payments

7. **Publish OpenAPI/Swagger specs**
   - Make every endpoint's schema machine-readable at `api.devdrops.run/openapi.json`
   - Agents and developer tools can auto-integrate

### Tier 2: Developer Community (humans find you, tell their agents)

8. **x402.org ecosystem page**
   - Submit a PR to coinbase/x402 repo to get listed on the official ecosystem page
   - High-authority listing — this is where developers look first
   - FREE, just needs a GitHub PR

9. **awesome-x402 GitHub repo**
   - Community-curated list of x402 projects
   - Submit PR — relatively easy to get listed
   - FREE

10. **Dev.to / Medium technical posts**
    - Write "How I built 25 x402 APIs on Cloudflare Workers" — this is genuinely interesting content
    - The x402 dev community is small and hungry for real build content
    - Cross-post to Hashnode, Hacker News
    - FREE

11. **Coinbase Developer Discord**
    - Active community. Share what you've built, help others, get feedback
    - Developer relations teams at Coinbase actively look for ecosystem builders to feature
    - FREE

12. **Twitter/X #x402 community**
    - Post builds, share revenue data (if comfortable), engage with other builders
    - Tag @CoinbaseDev, @Cloudflare when launching products
    - The community is small — active builders get noticed fast
    - FREE

13. **Product Hunt launch**
    - "DevDrops — 25 pay-per-query data APIs for AI agents"
    - Unique enough to get attention. Launch once you have 10+ products live
    - FREE

14. **GitHub — open-source client libraries**
    - Publish `@devdrops/client` npm package that wraps your x402 endpoints
    - Makes integration trivial for developers
    - GitHub stars = organic discovery
    - FREE

### Tier 3: Content & SEO (long-term organic traffic)

15. **devdrops.run/blog**
    - Technical posts about building x402 APIs, data engineering, agent economy
    - Target keywords: "x402 API", "prediction market API", "property data API", "sports odds API micropayments"
    - Each product page is also an SEO landing page

16. **devdrops.run/docs**
    - Comprehensive API documentation with interactive examples
    - Agents and developers land here from search
    - Good docs = organic referrals

17. **Cloudflare showcase / Workers examples**
    - Cloudflare features interesting Workers projects. A 25-product x402 suite is notable
    - Their blog regularly features ecosystem builders

### Tier 4: Ecosystem Partnerships

18. **Agent framework integrations**
    - Build plugins/skills for: OpenClaw, LangChain, AutoGPT, CrewAI
    - Each integration is a distribution channel — agents using those frameworks discover your data

19. **Coinbase developer grants**
    - Coinbase runs developer programs for x402 ecosystem builders
    - A 25-product data suite is exactly what they want to promote
    - Could include funding, co-marketing, featured placement

20. **Cloudflare Workers Launchpad**
    - Cloudflare's startup program for builders on their platform
    - Offers resources, mentorship, and visibility

---

## Key Insight on Discovery

The most important thing I found in the research: **discovery is the biggest bottleneck in the x402 ecosystem, not payment infrastructure.** 

Bankr explicitly built their agent discovery layer because "deployment alone does not generate revenue if agents cannot find the service." The x402 Bazaar exists specifically because agents were static — they could only use services their developers manually coded.

This means your strategy should be:

1. **Be in every machine-readable directory** (Bazaar, x402scan, Bankr, Stripe MPP directory, MCP registries)
2. **Rich metadata on every endpoint** (descriptions, schemas, example responses) — agents choose services based on this metadata
3. **Be the most complete provider** — an agent that finds 10 DevDrops endpoints across different categories is more likely to trust and return to DevDrops for its 11th query
4. **Volume of products matters** — 25 endpoints across diverse categories creates a network effect in discovery. Agent finds your weather API, sees you also have FX rates and sentiment analysis, uses those too.

This is why the "build many lightweight products" strategy is right. Each product is a discovery surface. Each discovery leads to cross-selling other products.
