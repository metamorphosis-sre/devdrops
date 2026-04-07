# DevDrops — New Product Build Queue (Researched & Vetted)

> **For Claude Code:** This file contains 18 new product opportunities researched and vetted for legal, financial, and technical viability. Each product has a clear data source, build effort estimate, and risk assessment. Add these to the DevDrops build queue and implement in the suggested phase order.
>
> **Status of existing products:** 22 products live as of 2026-04-06 (per STATE.md). These additions would bring total to 40.

---

## How to read this file

Each product has:
- **What:** What the endpoint does
- **Demand evidence:** Why agents want this (researched, not guessed)
- **Data source:** Primary + backup, with licensing notes
- **Pricing:** Suggested per-query price
- **Build effort:** Realistic time to ship
- **Risk score:** LOW / MEDIUM / HIGH across legal, financial, technical
- **Legal notes:** Specific compliance considerations
- **Financial verdict:** Whether the upstream cost model supports profitability
- **Build phase:** When to ship (Phase 1 = this week, Phase 2 = next month, Phase 3 = later)

---

## TIER S: Ship This Week (Trivial, High Demand)

These are 30-minute builds with zero upstream cost and confirmed demand.

### N1. QR Code Generator
- **Endpoint:** `GET /api/qr/*`
- **What:** Submit text/URL → return QR code (PNG, SVG, or base64). Optional styling parameters
- **Demand evidence:** Universal utility for content agents, payment link generators, contact card builders, ticket systems. Currently only available via subscription services or self-hosting
- **Data source:** None — uses `qrcode` npm package locally in the Worker
- **Pricing:** $0.001/code
- **Build effort:** 30 minutes
- **Risk score:** LOW / LOW / LOW
- **Legal notes:** None — generating a QR code from user input is not regulated
- **Financial verdict:** Pure profit at any volume. Zero marginal cost
- **Build phase:** Phase 1 — this week

### N2. Crypto Token Prices
- **Endpoint:** `GET /api/crypto/*`
- **What:** Submit token symbol or contract address → current price, 24h change, market cap, volume, supply
- **Demand evidence:** The primary x402 user base is crypto-native agents. CoinGecko's free tier is rate-limited; agents need a frictionless x402 alternative
- **Data source:** CoinCap API (free, no key, no rate limits documented), CoinGecko free tier as backup (10-30 calls/min)
- **Pricing:** $0.001/query
- **Build effort:** 1 hour
- **Risk score:** LOW / LOW / LOW
- **Legal notes:** Price data is factual and not regulated. Add disclaimer "Not financial advice"
- **Financial verdict:** Zero upstream cost, high volume potential. Strong margin
- **Build phase:** Phase 1 — this week

### N3. VAT/Tax ID Verification
- **Endpoint:** `GET /api/vat/*`
- **What:** Submit a VAT number → verify validity, return registered business name and address
- **Demand evidence:** Invoicing agents, e-commerce compliance tools, KYB checks. The EU VIES system is functional but uses SOAP and is clunky to integrate. UK HMRC VAT API has its own format. Agents currently have to integrate both
- **Data source:** EU VIES SOAP API (free, no key), UK HMRC VAT Registration API (free with registration)
- **Pricing:** $0.01/verification
- **Build effort:** 2 hours (the SOAP wrapper is the only complexity)
- **Risk score:** LOW / LOW / LOW
- **Legal notes:** Both APIs are explicitly designed for public verification. No PII handling — VAT numbers are public business identifiers
- **Financial verdict:** Zero upstream cost. Useful for B2B compliance agents
- **Build phase:** Phase 1 — this week

### N4. Timezone & Public Holidays
- **Endpoint:** `GET /api/time/*`
- **What:** Submit city or coordinates → current local time, UTC offset, DST status, current holiday status, next business day
- **Demand evidence:** Scheduling agents, outreach tools, meeting planners need this constantly. Existing solutions require combining IANA timezone database with separate holiday APIs
- **Data source:** Built-in JS Intl.DateTimeFormat for timezones (free, no API), Nager.Date API (free, open-source, 100+ countries' public holidays)
- **Pricing:** $0.001/query
- **Build effort:** 2 hours
- **Risk score:** LOW / LOW / LOW
- **Legal notes:** None
- **Financial verdict:** Near-zero upstream cost. Pure utility
- **Build phase:** Phase 1 — this week

---

## TIER A: High-Demand Niches (Ship Within 2 Weeks)

### N5. Stock Price & Market Data
- **Endpoint:** `GET /api/stocks/*`
- **What:** Submit ticker → current price, daily change, volume, 52-week range, market cap, basic fundamentals
- **Demand evidence:** Stock price was THE first service listed on the x402 Bazaar (Prixe). Trading agents, research agents, portfolio monitoring all need this. Confirmed highest-demand financial product
- **Data source:** Alpha Vantage (free tier: 25 requests/day), Financial Modeling Prep (free tier: 250 requests/day), Yahoo Finance unofficial (free, no key — but check ToS)
- **Backup:** Twelve Data (free tier: 800/day), IEX Cloud (free tier)
- **Pricing:** $0.005/query
- **Build effort:** 4 hours (mostly normalising responses across providers)
- **Risk score:** LOW / MEDIUM / LOW
- **Legal notes:** Yahoo Finance scraping has historically been a grey area — Yahoo has tolerated unofficial wrappers but doesn't sanction them. Use Alpha Vantage and FMP as primary; Yahoo as fallback only. Add "Not financial advice" disclaimer
- **Financial verdict:** Free tiers are tight (25/day for Alpha Vantage). Will hit limits fast at any meaningful volume. Mitigate with aggressive caching (5-min TTL for prices is acceptable). May need to pay for Alpha Vantage Premium ($49.99/mo for 75 calls/min) once volume justifies it
- **Build phase:** Phase 2 — next 2 weeks

### N6. URL Content Extractor & Cleaner
- **Endpoint:** `GET /api/extract/*?url={url}`
- **What:** Submit any URL → return clean extracted text, title, author, publish date, structured metadata. Strips ads, navigation, cookies banners
- **Demand evidence:** Confirmed top-4 x402 use case category. Simplescraper, Firecrawl already sell this via x402 — proven market. Research agents need clean web content
- **Data source:** PASS-THROUGH — fetch URL from your Worker, extract with `@mozilla/readability` JS library
- **Pricing:** $0.005/extraction (text only) or $0.02 with AI summary
- **Build effort:** 4 hours
- **Risk score:** LOW / LOW / MEDIUM
- **Legal notes:** Web scraping is legal in the UK and US (Van Buren v US, hiQ v LinkedIn). However, you should respect robots.txt and rate-limit per domain to avoid being seen as malicious. Don't scrape sites that explicitly prohibit it in their ToS. Don't reproduce full copyrighted content — return excerpts/summaries only for paywalled sites
- **Financial verdict:** Cloudflare Workers has some bandwidth costs at high volume but remains cheap. Strong margin
- **Build phase:** Phase 2 — next 2 weeks

### N7. Sanctions & PEP Screening
- **Endpoint:** `GET /api/sanctions/*?name={name}`
- **What:** Submit a name → fuzzy-match check against global sanctions lists (OFAC SDN, EU consolidated, UK HMT, UN), return any matches with confidence scores
- **Demand evidence:** AWS explicitly identifies "compliance agent needs a one-time sanctions screening" as a key x402 use case. Current providers (Refinitiv World-Check, ComplyAdvantage) charge $5,000+/month enterprise contracts. No x402 alternative
- **Data source:** OFAC SDN list (free CSV download from US Treasury), EU Consolidated Sanctions (free XML from EEAS), UK HMT Sanctions (free CSV from gov.uk), UN Sanctions (free XML)
- **Pricing:** $0.05/check (high-value compliance product)
- **Build effort:** 1-2 days (fuzzy name matching with Levenshtein/Jaro-Winkler is the hard part. Need a daily cron to refresh the lists)
- **Risk score:** LOW / LOW / MEDIUM
- **Legal notes:** **Critical disclaimer required:** "This is a data lookup service, not a regulated compliance solution. Users must verify matches independently and should not rely solely on this output for sanctions compliance. DevDrops is not a regulated KYC/AML provider." This protects you from liability. The sanctions lists themselves are explicitly published for public use
- **Financial verdict:** Zero upstream cost (lists are free). High-value query type — agents will pay $0.05 because alternatives cost $5,000/mo
- **Build phase:** Phase 2 — next 2 weeks

### N8. Company Enrichment from Domain
- **Endpoint:** `GET /api/company/*?domain={domain}`
- **What:** Submit a company website → return structured profile: industry guess, headquarters location, employee count estimate, founding date, social profiles, key tech stack
- **Demand evidence:** Lead enrichment is explicitly named as a top x402 use case category. Clearbit, Apollo, Hunter.io charge $99-999/month subscriptions
- **Data source:** Companies House (UK), OpenCorporates (free tier: 200 requests/month), public website meta tags, LinkedIn public company pages (scrape with care)
- **Pricing:** $0.02/lookup
- **Build effort:** 1 day
- **Risk score:** MEDIUM / LOW / MEDIUM
- **Legal notes:** **Most sensitive product on the list.** LinkedIn's ToS explicitly prohibits scraping. Even though hiQ v LinkedIn ruled scraping public profiles is legal in the US, LinkedIn aggressively blocks IPs and the case is ongoing. **Recommendation:** Skip LinkedIn entirely. Use only Companies House, OpenCorporates, and the company's own website (which is fair game). Be transparent about data sources in the response
- **Financial verdict:** OpenCorporates free tier is very tight (200/mo). Will need their paid tier ($89/mo for 10K requests) at scale. Companies House is unlimited and free — UK-focused MVP first, US later
- **Build phase:** Phase 2 — next 2 weeks (start UK-only)

---

## TIER B: Specialised & Niche (Ship Within 1 Month)

### N9. Website Tech Stack Detector
- **Endpoint:** `GET /api/techstack/*?url={url}`
- **What:** Submit URL → return detected technologies (CMS, frameworks, analytics, hosting, payment processors)
- **Demand evidence:** Sales agents qualifying leads, competitive intelligence, security researchers. BuiltWith and Wappalyzer are the standards but require subscriptions for API access
- **Data source:** Wappalyzer open-source fingerprint database (MIT license, free on GitHub), your own HTTP header analysis
- **Pricing:** $0.01/scan
- **Build effort:** 2 days (the fingerprint matching engine requires care)
- **Risk score:** LOW / LOW / MEDIUM
- **Legal notes:** Detecting tech stack from public HTML/headers is fine. The Wappalyzer database license is MIT, which permits commercial use. Credit Wappalyzer in your docs
- **Financial verdict:** Zero upstream cost. Must keep fingerprint DB updated quarterly
- **Build phase:** Phase 3 — month 1

### N10. ASN & Network Information
- **Endpoint:** `GET /api/asn/*?ip={ip}` or `GET /api/asn/*?asn={asn}`
- **What:** Submit IP or ASN → return autonomous system info: organisation, country, IP ranges, peering relationships
- **Demand evidence:** Security agents, network analysis tools, fraud detection. Currently requires combining BGP data with WHOIS — fragmented and slow
- **Data source:** Team Cymru IP-to-ASN API (free, DNS-based), MaxMind GeoLite2-ASN database (free, included in your existing GeoLite2 subscription)
- **Pricing:** $0.005/query
- **Build effort:** 4 hours (DNS lookups are fast and simple)
- **Risk score:** LOW / LOW / LOW
- **Legal notes:** None — ASN data is public network infrastructure information
- **Financial verdict:** Zero upstream cost. Strong margin
- **Build phase:** Phase 3 — month 1

### N11. Image Generation Proxy
- **Endpoint:** `POST /api/image/*`
- **What:** Submit text prompt → return AI-generated image
- **Demand evidence:** Several x402 image generation services already exist (proven demand). Content agents, social media tools, marketing automation all need this
- **Data source:** Cloudflare Workers AI (includes Stable Diffusion XL, Flux models — generous free tier on paid Workers plan), Stability AI as backup
- **Pricing:** $0.02/image (Cloudflare Workers AI is essentially free up to 10K neurons/day on paid plan)
- **Build effort:** 4 hours
- **Risk score:** LOW / LOW / LOW
- **Legal notes:** **Important:** Add content moderation and prompt filtering to prevent generation of illegal content (CSAM, copyrighted characters, real people in compromising situations). Cloudflare Workers AI includes some safety layers but you should add prompt-based filtering on top. Include ToS forbidding misuse
- **Financial verdict:** Cloudflare Workers AI is included in your existing $5/mo plan up to free tier limits. After that, Cloudflare charges per neuron-million. Profitable at $0.02/image
- **Build phase:** Phase 3 — month 1

### N12. World Bank Economic Indicators
- **Endpoint:** `GET /api/economy/*?country={iso}&indicator={code}`
- **What:** Submit country code + indicator → return historical and current economic data: GDP, inflation, unemployment, population, life expectancy, etc
- **Demand evidence:** Research agents, financial analysis tools, due diligence reports. World Bank API exists but is poorly documented and clunky
- **Data source:** World Bank Open Data API (free, no key, commercial use allowed)
- **Pricing:** $0.005/query
- **Build effort:** 4 hours (the value is normalising and structuring the response, which is currently messy XML/JSON)
- **Risk score:** LOW / LOW / LOW
- **Legal notes:** World Bank data is published under CC BY 4.0 — commercial use allowed with attribution. Add "Data: World Bank Open Data" in your response
- **Financial verdict:** Zero upstream cost. Niche but valuable for research workflows
- **Build phase:** Phase 3 — month 1

### N13. UK Property Market Statistics
- **Endpoint:** `GET /api/uk-property/*`
- **What:** Submit postcode/region → return Land Registry sold prices, average price by property type, transaction volumes, year-on-year changes
- **Demand evidence:** Your existing property intelligence product covers this conceptually but a dedicated UK statistics endpoint serves a different agent type — analysts vs lookups
- **Data source:** HM Land Registry Open Data (free, monthly bulk CSV dumps), ONS House Price Index API (free)
- **Pricing:** $0.01/query
- **Build effort:** 1-2 days (need to cache and index the Land Registry data — it's large)
- **Risk score:** LOW / LOW / MEDIUM
- **Legal notes:** Land Registry data is Crown Copyright under Open Government Licence — commercial use allowed with attribution
- **Financial verdict:** Zero upstream cost. Plays to your domain expertise. Could become a flagship product
- **Build phase:** Phase 3 — month 1

### N14. NHS Data & Health Statistics (UK)
- **Endpoint:** `GET /api/health/*`
- **What:** Submit query → return NHS-published statistics: GP prescribing data, hospital wait times, postcode-level health metrics
- **Demand evidence:** Healthcare research agents, policy analysis tools, journalism. NHS data is published but extremely fragmented across portals
- **Data source:** NHS Digital APIs (free, no key for most data), data.gov.uk health datasets
- **Pricing:** $0.01/query
- **Build effort:** 1-2 days (fragmented sources need consolidation)
- **Risk score:** LOW / MEDIUM / MEDIUM
- **Legal notes:** **Important:** Use only AGGREGATED, ANONYMISED published statistics. Never patient-level data. NHS Digital publishes data under Open Government Licence. Add medical disclaimer: "Not medical advice. For research purposes only"
- **Financial verdict:** Zero upstream cost. Niche but underserved
- **Build phase:** Phase 3 — month 1

### N15. Carbon Footprint & Emissions Data
- **Endpoint:** `GET /api/carbon/*`
- **What:** Submit query type (flight, electricity, product) → return carbon footprint estimate and offset pricing
- **Demand evidence:** ESG reporting agents, sustainability tools, corporate compliance. Climatiq charges €99-999/mo for similar API
- **Data source:** UK BEIS Conversion Factors (free, official UK government emissions factors), EU emission factor databases (free), Climatiq free tier (limited)
- **Pricing:** $0.01/query
- **Build effort:** 2 days (need to build calculation logic from raw factors)
- **Risk score:** LOW / LOW / MEDIUM
- **Legal notes:** Use official government emission factors so calculations are defensible. Add disclaimer that figures are estimates based on standard methodologies
- **Financial verdict:** Zero upstream cost. Growing demand area
- **Build phase:** Phase 3 — month 1

---

## TIER C: Advanced/Speculative (Phase 4+)

### N16. UK Court & Tribunal Decisions
- **Endpoint:** `GET /api/courts/*`
- **What:** Search UK court judgements by party name, date, court, topic → return case summaries and links
- **Demand evidence:** Legal research agents, due diligence tools, journalism. The National Archives has a free API but it's clunky
- **Data source:** The National Archives Find Case Law API (free), BAILII (scraping with care)
- **Pricing:** $0.01/query
- **Build effort:** 2-3 days
- **Risk score:** LOW / LOW / MEDIUM
- **Legal notes:** Court judgements are public record. Find Case Law is officially published and free to use. **Do not provide legal advice** — return case data only with disclaimer "Not legal advice. Consult a qualified solicitor"
- **Financial verdict:** Zero upstream cost. Niche but valuable for legal-tech agents
- **Build phase:** Phase 4 — month 2+

### N17. Patent Search
- **Endpoint:** `GET /api/patents/*`
- **What:** Search patents by query, inventor, assignee → return patent summaries, filing dates, claims
- **Demand evidence:** R&D agents, IP research, competitive intelligence. USPTO and EPO have free APIs but separate
- **Data source:** USPTO PatentsView API (free), EPO Open Patent Services (free with registration), Google Patents Public Datasets (free)
- **Pricing:** $0.01/query
- **Build effort:** 3 days (multiple sources to normalise)
- **Risk score:** LOW / LOW / MEDIUM
- **Legal notes:** Patent data is public domain. Add disclaimer "Not legal advice on patent validity"
- **Financial verdict:** Zero upstream cost. Niche but high-value for specific use cases
- **Build phase:** Phase 4 — month 2+

### N18. Cloudflare-Native AI Inference Endpoint
- **Endpoint:** `POST /api/ai/llm`
- **What:** Submit a prompt → get a response from a small/fast LLM (e.g., Llama 3.1 8B). DevDrops becomes a pay-per-prompt LLM gateway
- **Demand evidence:** "AI inference - pay-per-prompt wrappers around model APIs" is identified as a top x402 use case category. Several already exist (proven market)
- **Data source:** Cloudflare Workers AI (Llama 3.1, Mistral, Qwen — included in Workers plan with generous free neurons)
- **Pricing:** $0.005/request for small models, $0.02 for larger ones
- **Build effort:** 4 hours
- **Risk score:** LOW / LOW / LOW
- **Legal notes:** Add prompt filtering for safety. Include ToS forbidding misuse. Cloudflare Workers AI includes some safety. Don't market as a replacement for Claude or GPT-4 — these are utility models for simple tasks
- **Financial verdict:** Cloudflare Workers AI free tier is generous on the paid plan. Strong margins until you scale
- **Build phase:** Phase 4 — month 2+

---

## CRITICAL ANALYSIS — Aggregate View

### Legal risk summary

**Lowest risk (no special handling needed):** N1 (QR), N2 (Crypto), N3 (VAT), N4 (Time), N10 (ASN), N12 (World Bank), N13 (UK Property), N15 (Carbon)

**Medium risk (requires specific disclaimers):** N5 (Stocks — financial disclaimer), N7 (Sanctions — compliance disclaimer), N9 (Tech stack — attribution), N11 (Image gen — content moderation), N14 (NHS — medical disclaimer), N16 (Courts — legal disclaimer), N17 (Patents — IP disclaimer), N18 (AI — content filtering)

**Higher risk (requires careful implementation):** N6 (URL extraction — robots.txt compliance), N8 (Company enrichment — avoid LinkedIn entirely)

**Avoid completely:**
- LinkedIn data scraping (banned by ToS, ongoing litigation)
- Facial recognition (existing prohibition in Claude's safety guidelines)
- Personal data aggregation (GDPR risk)
- Stock recommendations or trading signals (FCA regulated)
- Medical diagnosis or treatment recommendations (regulated)

### Financial verdict summary

**Zero upstream cost (pure profit):** N1, N2, N4, N7, N9, N10, N11, N12, N13, N14, N15, N16, N18

**Tight free tier — caching essential:** N5 (Stocks — Alpha Vantage 25/day), N8 (Company — OpenCorporates 200/mo)

**Will need paid upgrade at scale:** N5 ($49.99/mo Alpha Vantage Premium when justified), N8 ($89/mo OpenCorporates)

**Variable AI cost:** N11 (image gen — included in Cloudflare AI free tier mostly), N18 (LLM — same)

### Build effort summary

**30 minutes:** N1 (QR)
**Few hours:** N2, N3, N4, N5, N6, N9, N10, N11, N12, N13, N14, N15, N18 (mostly 1 day or less)
**1-3 days:** N7, N8, N16, N17

### Strategic priorities

If you can only build 5 of these in the next 2 weeks, build:

1. **N1 QR Generator** — 30 minutes, zero risk, immediate revenue
2. **N2 Crypto Prices** — serves your core x402 audience (crypto-native agents)
3. **N7 Sanctions Screening** — highest-margin opportunity, no competition in x402
4. **N6 URL Extractor** — confirmed top-4 demand category
5. **N5 Stock Prices** — was the first Bazaar listing (proven demand)

These five alone diversify your portfolio across utility, crypto, compliance, web intelligence, and finance — the five highest-value categories in the x402 ecosystem.

---

## How to add these to the build queue

For Claude Code:

1. Read this entire file
2. For each product N1-N18, create a stub route file in `src/routes/`
3. Add each route to `src/index.ts` with x402 middleware and the suggested price
4. Add the data source to `src/db/seeds.sql` (where applicable)
5. Update `wiki/PROJECT.md` to include these as "Planned" with their phase
6. Update `wiki/STATE.md` to track build status
7. Implement Tier S products (N1-N4) immediately — they're 30min-2hr each
8. Create GitHub issues for Tier A and B products to track
9. Commit with message: "Add 18 new product opportunities to build queue (research-vetted)"

Each new product should follow the existing pattern in your codebase:
- Self-contained route file
- Uses the shared payment middleware
- Follows the existing pricing tier structure ($0.001 / $0.005 / $0.01 / $0.02 / $0.05 / $0.10)
- Includes proper error handling and backup data sources
- Returns clean JSON with consistent structure
- Has a description that will appear in the x402 Bazaar discovery
