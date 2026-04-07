# DevDrops — High-Demand Niche Products (Research-Backed Additions)

## What agents actually struggle to access (confirmed by ecosystem research)

### Category A: Business & Lead Enrichment (highest confirmed demand)

#### 26. Company Enrichment API
- **What:** Submit a company name or domain → get structured profile: industry, employee count, revenue range, tech stack, social profiles, founding date, headquarters location
- **Why it's in demand:** Lead enrichment is explicitly named as one of the top x402 use cases. Sales agents and CRM tools need this constantly. Current providers (Clearbit, Apollo) charge $99-999/month subscriptions
- **Data approach:** COLLECTED — scrape/aggregate from Companies House, LinkedIn public pages, OpenCorporates, company websites. Store in D1, refresh weekly
- **Primary sources:** Companies House (free), OpenCorporates (free tier), BuiltWith (tech stack, limited free), company websites via scraping
- **Price:** $0.02–$0.05/lookup
- **Build effort:** Medium

#### 27. Website Tech Stack Detector
- **What:** Submit a URL → get the full technology stack: CMS, frameworks, analytics tools, hosting provider, CDN, payment processors, marketing tools
- **Why it's in demand:** Sales agents qualifying leads need to know what tech a prospect uses. Competitive intelligence agents use this. Wappalyzer (the standard tool) requires a subscription
- **Data approach:** PASS-THROUGH — fetch the URL from your Worker, parse HTML headers, scripts, meta tags against a technology fingerprint database
- **Primary sources:** Wappalyzer open-source fingerprint database (free, MIT licensed on GitHub), your own HTTP header analysis
- **Price:** $0.01–$0.03/scan
- **Build effort:** Medium (need to maintain fingerprint DB)

#### 28. Business Email Finder
- **What:** Submit a company domain → get likely email patterns and verified contact emails for key roles (CEO, CTO, sales, support)
- **Why it's in demand:** Outreach agents need this. Hunter.io charges $49-499/month. No x402 alternative exists
- **Data approach:** COMPUTED — check common email patterns (first@domain, first.last@domain) against MX records, verify with SMTP where possible
- **Primary sources:** DNS MX lookups (free), common name databases, LinkedIn public profiles
- **Price:** $0.02–$0.05/lookup
- **Build effort:** Medium
- **Legal note:** Must comply with GDPR — only return business email patterns, not personal data. Verify consent model with accountant

### Category B: Web Intelligence (confirmed high demand — "walled garden data")

#### 29. URL Content Extractor & Summariser
- **What:** Submit any URL → get clean extracted text, title, author, publish date, key topics, and an AI summary. Strips ads, navigation, cookies banners
- **Why it's in demand:** This is one of the top confirmed x402 use cases. Agents doing research need clean web content but scraping is messy. Simplescraper, Firecrawl already sell this via x402 — proven market
- **Data approach:** PASS-THROUGH — fetch URL, extract with Readability-style parser, optionally summarise with Claude API
- **Price:** $0.005 for extraction only, $0.02 with AI summary
- **Build effort:** Low-medium
- **Note:** Competition exists (Simplescraper, Firecrawl) but the market is large enough for multiple providers

#### 30. Screenshot-as-a-Service
- **What:** Submit a URL → get a rendered screenshot (PNG/JPEG) at specified resolution
- **Why it's in demand:** Agents building reports, monitoring websites, doing visual comparison need screenshots. Requires headless browser infrastructure that's expensive to run
- **Data approach:** PASS-THROUGH — use a headless browser to render and capture
- **Technical constraint:** Cloudflare Workers can't run headless browsers natively. Would need Browserbase (x402-enabled, ~$0.05/session) as backend, or Cloudflare Browser Rendering (in beta)
- **Price:** $0.02–$0.05/screenshot
- **Build effort:** Medium (depends on browser rendering availability)

### Category C: Financial Data (confirmed high demand for agents)

#### 31. Stock Price & Market Data API
- **What:** Submit a ticker → get current price, daily change, volume, 52-week range, market cap, basic financials
- **Why it's in demand:** This was literally the first service listed on the x402 Bazaar (Prixe). Trading agents, research agents, portfolio monitoring agents all need this. Financial data APIs are expensive ($200-2000/month)
- **Data approach:** PASS-THROUGH with caching — fetch from free sources, cache in KV for 5-minute freshness
- **Primary sources:** Yahoo Finance (unofficial API, free, check ToS), Alpha Vantage (free tier: 25 requests/day), Financial Modeling Prep (free tier: 250 requests/day)
- **Backup sources:** IEX Cloud (free tier available), Twelve Data (free tier: 800/day)
- **Price:** $0.005–$0.01/query
- **Build effort:** Low

#### 32. Crypto Price & Token Data API
- **What:** Submit a token symbol or contract address → get current price, 24h change, market cap, volume, liquidity info
- **Why it's in demand:** Crypto agents are the primary x402 users. Many existing x402 services are crypto-focused, but most serve on-chain data, not simple price feeds
- **Data approach:** PASS-THROUGH with caching
- **Primary sources:** CoinGecko API (free tier: 10-30 calls/min), CoinCap API (free, no key needed)
- **Backup sources:** Messari (free tier), CryptoCompare (free tier)
- **Price:** $0.001–$0.005/query
- **Build effort:** Very low

### Category D: Compliance & Verification (confirmed enterprise need)

#### 33. Sanctions & PEP Screening API
- **What:** Submit a name → check against global sanctions lists (OFAC SDN, EU sanctions, UN sanctions, UK HMT) and Politically Exposed Persons databases
- **Why it's in demand:** AWS explicitly calls out "a compliance agent that needs a one-time sanctions screening" as a key x402 use case. Current providers charge per-check but require annual contracts
- **Data approach:** COLLECTED — download sanctions lists (all free, published by governments), index in D1, fuzzy-match against queries
- **Primary sources:** OFAC SDN list (free, US Treasury), EU Consolidated Sanctions (free), UK HMT Sanctions (free), UN Sanctions (free)
- **Price:** $0.05–$0.25/check (high value, compliance-critical)
- **Build effort:** Medium (fuzzy name matching is the hard part)
- **Legal note:** You're providing data lookup, not regulated compliance advice. Include disclaimer

#### 34. VAT/Tax ID Verification API
- **What:** Submit a VAT number → verify it's valid and get the registered business name and address
- **Why it's in demand:** Invoicing agents, e-commerce compliance, KYB checks. The EU VIES system is free but clunky
- **Data approach:** PASS-THROUGH — query EU VIES API (free), UK HMRC VAT API (free), format and return
- **Primary sources:** EU VIES SOAP API (free, no key), UK HMRC VAT Registration API (free with registration)
- **Price:** $0.01–$0.02/verification
- **Build effort:** Low

### Category E: Content & Creative (growing demand)

#### 35. Image Generation Proxy
- **What:** Submit a text prompt → get an AI-generated image back
- **Why it's in demand:** Content agents, social media agents, marketing agents all need images. Several x402 image generation services already exist — proven demand
- **Data approach:** PASS-THROUGH — proxy to a free/cheap image generation API, mark up the cost
- **Primary sources:** Cloudflare Workers AI (includes free image generation models), Stability AI (free tier available)
- **Price:** $0.02–$0.10/image
- **Build effort:** Low if using Cloudflare Workers AI

#### 36. QR Code Generator
- **What:** Submit text/URL → get a QR code image (PNG/SVG) with optional styling
- **Why it's in demand:** Simple utility that agents need for generating links, payment codes, contact cards. Trivial to build, zero upstream cost
- **Data approach:** COMPUTED — generate QR code entirely in the Worker using a JS library (no external API needed)
- **Primary sources:** None needed — qrcode npm package generates QR codes locally
- **Price:** $0.001/code
- **Build effort:** Very low — could ship in 30 minutes

### Category F: Communication & Productivity

#### 37. Timezone & Working Hours API
- **What:** Submit a city or coordinates → get current local time, UTC offset, whether it's a business day, next business day, current holiday status
- **Why it's in demand:** Scheduling agents, outreach agents, and meeting planners need this. Surprisingly fragmented data — timezone databases exist but holiday calendars and business hours require combining multiple sources
- **Data approach:** COMPUTED + COLLECTED — timezone from built-in APIs, holidays from Nager.Date (free, open-source), business hours logic
- **Primary sources:** Nager.Date API (free, covers 100+ countries' public holidays), IANA timezone database (built into JS runtime)
- **Price:** $0.001–$0.005/query
- **Build effort:** Low

---

## Updated Build Priority — Quick Wins to Add

These products should slot into Phase 1 or 2 because they're trivially easy to build and have confirmed demand:

**Ship in first week (30 min each):**
- #36 QR Code Generator — zero dependencies, pure JS
- #32 Crypto Prices — CoinCap API, no key needed
- #37 Timezone/Holidays — built-in JS + free Nager.Date API

**Ship in second week:**
- #31 Stock Prices — free Alpha Vantage/FMP
- #34 VAT Verification — free EU/UK government APIs
- #29 URL Content Extractor — Readability parser in JS

**Ship in month 1:**
- #26 Company Enrichment — Companies House + OpenCorporates aggregation
- #27 Tech Stack Detector — Wappalyzer open-source fingerprints
- #33 Sanctions Screening — government sanctions list downloads

These 9 additions bring you to 34 products, with the new ones specifically targeting confirmed high-demand categories.
