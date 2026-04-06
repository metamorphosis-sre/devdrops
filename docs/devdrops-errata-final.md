# DevDrops.run — Due Diligence Errata (Final Pre-Execution Review)

**Date:** 6 April 2026  
**Status:** All critical issues identified and resolved below. Plan is cleared for execution with these corrections applied.

---

## CRITICAL CORRECTIONS

### 1. Weather API (Product #14) — Commercial licensing problem

**Issue:** I listed Open-Meteo free API as the primary source. This is WRONG for commercial use. Their free API is explicitly non-commercial only. Their terms state: "You may only use the free API services for non-commercial purposes."

**Fix:** Replace primary source:
- **Primary:** Visual Crossing Weather API — free tier: 1,000 records/day, **commercial use explicitly allowed**, 50+ years historical data, no attribution link required on free tier. Requires API key (free registration)
- **Primary (alternative):** OpenWeatherMap — free tier: 60 calls/min (~86,400/day), **commercial use allowed under ODbL** (requires attribution). Requires API key
- **Backup:** Open-Meteo **paid plan** — €29/month for 1M requests, commercial use included
- **Backup:** US National Weather Service API — completely free, no key, no restrictions (US coverage only)

**Budget impact:** $0 if using Visual Crossing/OpenWeatherMap free tiers. €29/month if scaling to Open-Meteo paid.

### 2. IP Geolocation (Product #17) — Commercial licensing problem

**Issue:** I listed ip-api.com as primary source. Their free tier is **non-commercial only** (45 requests/min, non-commercial).

**Fix:** Replace primary source:
- **Primary:** MaxMind GeoLite2 database — free download with registration, **commercial use allowed** with attribution ("This product includes GeoLite2 data created by MaxMind"). Download the database monthly, import into D1. All lookups are then local (fast, free, no rate limits)
- **Primary (alternative):** Cloudflare itself exposes `cf.country`, `cf.city`, `cf.timezone` etc. in request headers for requests to your Worker. For basic geolocation of the *requesting agent*, you get this data for free automatically
- **Backup:** DB-IP Lite — free monthly database download, commercial use allowed with attribution
- **Backup:** IPinfo.io — free tier: 50K lookups/month, commercial use allowed

**Technical note:** GeoLite2 database is ~70MB. Too large for Workers KV. Options: (a) import into D1 as a table, (b) use R2 for storage and query via Worker, (c) use the Cloudflare request headers for basic geo and reserve GeoLite2 for enriched lookups

### 3. Email Verification (Product #16) — Technical constraint on Workers

**Issue:** I said "may need a lightweight companion service outside Cloudflare Workers" for SMTP checks. This needs clarification.

**Fix:** Cloudflare Workers **CAN** make outbound TCP connections on ports 587 and 465 (standard SMTP submission ports). Port 25 is blocked. This means:
- ✅ **Syntax validation** — works on Workers (pure code, no network)
- ✅ **MX record lookup** — works on Workers (DNS resolution via fetch to public DNS-over-HTTPS)
- ✅ **Disposable email detection** — works on Workers (maintain list in KV/D1)
- ⚠️ **SMTP handshake verification** — partially works. Many mail servers accept connections on port 587 but require authentication. The "does this mailbox exist" check via SMTP RCPT TO is increasingly unreliable as servers reject these to prevent spam enumeration
- ❌ **Port 25 SMTP** — blocked on Workers

**Recommendation:** Offer email verification as syntax + MX + disposable detection (all work natively on Workers). Don't promise full SMTP deliverability verification — it's unreliable even on dedicated servers. This is still valuable and honestly what most email verification APIs actually do.

### 4. D1 Free Tier — Already corrected in v2

Confirmed: 500MB per database on free plan, 10GB on paid ($5/month). The v2 strategy document correctly recommends starting on the paid plan. No further action needed.

---

## IMPORTANT CLARIFICATIONS

### 5. Data Redistribution — Legal grey areas to resolve before launch

**Polymarket Gamma API:**
- Reading market data is public and free
- Polymarket's Terms of Service should be checked for redistribution clauses before you go live with Product #3
- **Action:** Read Polymarket's ToS at polymarket.com/tos before launch. If redistribution is restricted, pivot to using only Kalshi (US-regulated, clearer data rights) + Manifold (open API) + Metaculus (research API)

**Kalshi API:**
- Public market data is accessible without authentication
- Commercial redistribution may require a data licensing agreement at scale
- **Action:** Email Kalshi's partnerships team before scaling beyond prototype

**The Odds API (sports odds, Product #4):**
- Free tier: 500 requests/month. Paid: $35/month for 10K requests
- Check their terms for redistribution rights — some odds APIs explicitly prohibit reselling aggregated data
- **Action:** Review The Odds API terms. If redistribution is restricted, use Smarkets API (UK exchange, generally more permissive) or Betfair Exchange API as primary

**General principle:** Government open data (Companies House, SEC EDGAR, Land Registry, Met Office, Environment Agency, Census) is safe — it's published specifically for reuse. Private API data (prediction markets, odds providers) needs ToS review per source.

### 6. Open-Meteo AGPLv3 License — Self-hosting implication

If you ever self-host Open-Meteo (instead of using their paid API), their code is AGPLv3. This means any modifications you make must be open-sourced, and if users interact with the software over a network (which they would via your API), you may need to make the entire application's source code available.

**Recommendation:** Use their paid API plan (€29/month) rather than self-hosting. This avoids AGPLv3 obligations entirely. Only consider self-hosting if you're comfortable open-sourcing your wrapper code.

### 7. Stripe MPP — Early access and geographic restrictions

**Confirmed:** MPP requires early access signup. Apply now at docs.stripe.com/payments/machine. Only US businesses can currently accept stablecoin payments via Stripe. Your UK entity can accept fiat/card MPP payments.

**Action:** Apply for MPP early access immediately. Even if approval takes weeks, you'll be ready to add the MPP payment rail as soon as it's available. x402 is your primary rail from day one.

### 8. Cloudflare Workers Cron Triggers

**Confirmed:** Available on both free and paid plans. Free plan: max 5 cron triggers. Paid plan: unlimited. Since we're on the $5/month paid plan, this is fine. You can run as many scheduled data collection jobs as needed.

### 9. Cloudflare Workers — Outbound fetch to external APIs

**Confirmed:** Workers can make outbound HTTP fetch() calls to any external API. This is how all data collection works — your cron-triggered Workers fetch data from Companies House, SEC EDGAR, weather APIs, odds APIs, etc. and store results in D1. No limitations here beyond the simultaneous connection limit (6 concurrent connections per invocation, but connections are freed after each fetch completes).

---

## MINOR CORRECTIONS

### 10. Frankfurter API (FX rates, Product #15)

**Confirmed:** Frankfurter.app is free, open-source, based on ECB reference rates. Updated daily (not real-time). No API key needed. Commercial use allowed. However, it only has ~33 currencies (ECB reference rates), not 170+.

**Fix:** Change description from "170+ currencies" to "33 major currencies (ECB reference rates) with daily updates. For real-time rates or exotic currencies, add ExchangeRate-API paid tier ($9.99/month for 300K requests) as backup."

### 11. Academic Paper Search (Product #21)

**Confirmed:** OpenAlex is genuinely free, no key needed, 100K requests/day, commercial use allowed. Semantic Scholar is also free for basic access. This product is solid as described. No changes needed.

### 12. Open Food Facts (Product #24)

**Confirmed:** Completely free, open-source (Open Database License), 3M+ products. Commercial use explicitly allowed with attribution. No changes needed.

### 13. Companies House API (Product #7)

**Confirmed:** Free, rate limit 600 requests per 5 minutes. Requires free API key registration. Commercial use of data is allowed — Companies House data is Crown Copyright published under Open Government Licence. No changes needed.

### 14. SEC EDGAR (Product #7)

**Confirmed:** Completely free, no key needed (just a User-Agent header with your email). No rate limit published but fair use expected (10 requests/sec recommended). Data is US government public domain. No changes needed.

---

## RISK REGISTER UPDATE

| # | Risk | Status | Mitigation |
|---|------|--------|------------|
| 1 | Open-Meteo commercial use | **RESOLVED** | Use Visual Crossing or OpenWeatherMap free tiers (commercial OK). Budget Open-Meteo paid €29/mo for scale |
| 2 | ip-api.com commercial use | **RESOLVED** | Use MaxMind GeoLite2 (free, commercial OK) or Cloudflare request headers |
| 3 | Email SMTP on Workers | **RESOLVED** | Limit to syntax + MX + disposable detection. Don't promise SMTP deliverability |
| 4 | Prediction market data redistribution | **ACTION NEEDED** | Read Polymarket + Kalshi ToS before launch. Pivot sources if restricted |
| 5 | Sports odds data redistribution | **ACTION NEEDED** | Read The Odds API terms. Have Smarkets/Betfair as fallback |
| 6 | Stripe MPP access timing | **ACTION NEEDED** | Apply for early access now |
| 7 | AGPLv3 if self-hosting Open-Meteo | **NOTED** | Use paid API, don't self-host |
| 8 | FX rates currency coverage | **RESOLVED** | Corrected to 33 currencies (ECB), noted upgrade path for more |

---

## PRE-EXECUTION CHECKLIST

Before you start building (next 48 hours):

- [ ] Register Cloudflare account, upgrade to Workers Paid ($5/month)
- [ ] Point devdrops.run DNS to Cloudflare
- [ ] Create Coinbase Developer Platform account, get x402 facilitator access
- [ ] Create Coinbase Business account for USDC receiving wallet
- [ ] Apply for Stripe MPP early access
- [ ] Register for Visual Crossing API key (weather)
- [ ] Register for OpenWeatherMap API key (weather backup)
- [ ] Register for Companies House API key
- [ ] Register for MaxMind GeoLite2 account (IP geolocation database download)
- [ ] Register for The Odds API key (sports odds)
- [ ] Install Claude Code on Mac Mini when it arrives
- [ ] Set up GitHub repo for devdrops
- [ ] Read Polymarket ToS for data redistribution rights
- [ ] Read Kalshi ToS for data redistribution rights  
- [ ] Read The Odds API terms for redistribution rights
- [ ] Get Circle testnet USDC for Base Sepolia (for testing x402 flows)

**All of the above registrations are free.**

---

## FINAL ASSESSMENT

The plan is **technically sound, legally viable, and commercially realistic** with the corrections above applied. The main risks are:

1. **Demand timing** (when will enough agents be paying for data?) — mitigated by 25-product portfolio and near-zero infrastructure costs
2. **Data source terms** (can you resell aggregated data?) — mitigated by using government open data for most products, and checking ToS for the 3-4 products that use private APIs
3. **Revenue expectations** — the x402 ecosystem is early. Be realistic about months 1-3 being about establishing presence, not generating significant income

None of these are blockers. The corrections above remove all the technical and legal issues I identified. You're clear to build.
