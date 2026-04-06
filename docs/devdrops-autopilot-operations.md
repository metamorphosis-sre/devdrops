# DevDrops.run — Autopilot Operations Manual

## The Three Claudes

DevDrops runs on three complementary systems, each with a distinct role:

**Claude Code (terminal)** — the builder. Used on-demand when you want to create a new product, fix a bug, or deploy an update. You open a terminal, describe what you want, Claude Code writes the Worker, tests it locally, and deploys to Cloudflare. This is your active development tool.

**Cowork (desktop agent)** — the operations manager. Runs scheduled tasks on your always-on Mac Mini. Handles the daily/weekly/fortnightly autopilot cycle: revenue reporting, data quality audits, competitor monitoring, new product discovery, and pricing optimisation. You review its output, approve recommendations, and it executes. This is your passive management layer.

**Cloudflare Workers (serverless)** — the runtime. Serves every API request 24/7 globally, collects data on cron schedules, logs transactions, monitors health, and auto-switches to backup data sources when primaries fail. This runs regardless of whether your Mac Mini is on. This is your production infrastructure.

### What happens if the Mac Mini goes down?

- Cloudflare Workers keep serving all 25 products — zero impact on revenue
- Cron data collection continues — zero impact on data freshness
- Health monitoring and auto-failover continues — zero impact on reliability
- What pauses: Cowork scheduled tasks (daily digest, weekly review, competitor scan)
- What you lose: visibility into performance until the Mini comes back
- Recovery: when Mini restarts and Claude Desktop opens, Cowork resumes its schedule automatically

The Mac Mini is for intelligence and improvement. Cloudflare is for operations. One can go down without affecting the other.

---

## Subscribe-Now Budget (hands-off approach)

Since you want minimal management overhead, subscribe to everything needed on day one:

| Item | Cost | Frequency | Why |
|------|------|-----------|-----|
| Cloudflare Workers Paid | $5 (£4) | Monthly | Required for D1 10GB, unlimited crons |
| The Odds API Standard | $35 (£28) | Monthly | Sports odds product — free tier too limited |
| Claude Pro subscription | $20 (£16) | Monthly | Required for Cowork + Claude Code |
| devdrops.run domain | ~£10 | Annual | Already owned |
| **Total fixed** | **~£49/month** | | |
| Claude API (usage-based) | ~£5-50/mo | Variable | Scales with AI product usage |
| **Total operational** | **~£54-100/month** | | |

Everything else runs on free tiers that are generous enough for months of operation. The health monitor will alert you if any free tier approaches its limit, at which point you decide whether revenue justifies the upgrade.

### What you're NOT subscribing to yet (and why)

| Item | Cost | Trigger to subscribe |
|------|------|---------------------|
| Open-Meteo paid | €29/mo | When weather queries exceed 1,000/day (Visual Crossing limit) |
| ExchangeRate-API paid | $10/mo | When FX queries exceed 1,500/month |
| Amadeus paid (flights) | $499/mo | Only if flight product generates significant traction — high cost |
| NewsAPI paid | $449/mo | Only if sentiment product scales massively — use free RSS instead |

The Cowork health monitor watches these thresholds and alerts you before you hit any limit.

---

## Cowork Scheduled Tasks (Mac Mini, 24/7)

### Setup (one-time, on Mac Mini arrival)

1. Install Claude Desktop, sign in with Pro account
2. Create a DevDrops project folder: `~/DevDrops/ops/`
3. In Cowork, create a Project pointed at `~/DevDrops/ops/`
4. Add a SKILL.md file in the folder with DevDrops operational context (products list, data sources, pricing, Cloudflare API credentials)
5. Connect MCP servers: GitHub, filesystem
6. Set up a Telegram bot for alert delivery (free, takes 5 minutes via BotFather)
7. Schedule the tasks below using `/schedule` in Cowork

### Task 1: Daily Revenue Digest
**Schedule:** Every day at 8:00 AM
**What it does:**
- Fetches yesterday's transaction log from D1 via Cloudflare API
- Counts queries per product, total revenue in USDC
- Compares to previous day and 7-day average
- Checks for any error spikes
- Sends a Telegram message:
  "DevDrops 5 Apr: 83 queries, $1.42 revenue (+12% WoW). Top: predictions (31), weather (22), filings (14). Errors: 1 (odds timeout, auto-switched to Smarkets). No action needed."

**Your time:** 10 seconds to read the Telegram message

### Task 2: Daily Data Quality Audit
**Schedule:** Every day at 6:00 AM (before digest)
**What it does:**
- Samples 5 random cached responses from each active product in D1
- Checks: is timestamp within expected freshness window? Is JSON schema valid? Are values within reasonable ranges (no negative prices, no temperatures of 999°C)?
- If anomaly found: auto-disables the affected product endpoint and sends alert
- If all clean: logs "quality OK" silently (no notification)

**Your time:** 0 seconds unless there's a problem

### Task 3: Weekly Performance Review
**Schedule:** Every Sunday at 9:00 AM
**What it does:**
- Pulls full week's analytics from D1
- Generates a report saved to `~/DevDrops/ops/reports/week-YYYY-WW.md`:
  - Revenue by product (chart)
  - Query volume trends (growing, flat, declining per product)
  - Error rates by product and data source
  - Abandoned 402s (agents who queried but didn't pay — by product)
  - Data source usage vs. quota limits
  - Recommendations: "Consider raising predictions price from $0.01 to $0.015 — volume is strong. Weather product had 3 timeout errors from Visual Crossing — OpenWeatherMap handled them as backup. Historical events had 0 queries all week — consider removing from Bazaar or making it free to build traffic."

**Your time:** 5 minutes to read and approve/reject recommendations

### Task 4: Weekly Competitor Scan
**Schedule:** Every Monday at 7:00 AM
**What it does:**
- Uses Chrome integration to browse x402.org/ecosystem, x402scan.com, Bankr marketplace
- Searches for new services in categories DevDrops competes in (weather, predictions, odds, property, filings)
- Compares their pricing and schemas against DevDrops products
- Saves report to `~/DevDrops/ops/reports/competitors-YYYY-WW.md`
- Alerts via Telegram only if a direct competitor is found: "New prediction market feed appeared on Bazaar: OddsFlow by @xyz, $0.008/query (your price: $0.01). Schema covers Polymarket + Kalshi only (you cover 5 platforms). No action needed — you have broader coverage."

**Your time:** 0 seconds if no competitors found; 2 minutes to read alert if one appears

### Task 5: Fortnightly Product Discovery Scout
**Schedule:** Every other Monday at 10:00 AM
**What it does:**
- Searches x402 Bazaar for what agents are querying but not finding (using Bazaar analytics if available, otherwise scanning dev forums and Twitter)
- Checks for new free/open data sources that could power additional products
- Cross-references against DevDrops product list to identify gaps
- If viable opportunity found, drafts a complete product spec:
  - Endpoint design
  - Data sources (primary + backup)
  - Pricing recommendation
  - Estimated build effort
- Saves to `~/DevDrops/ops/opportunities/YYYY-MM-DD-[name].md`
- Alerts: "New product opportunity: UK Food Standards Agency hygiene ratings. Free API, no key needed, commercial use allowed. Proposed: /food-safety endpoint at $0.005/query. Draft spec saved. Say 'build food-safety' in Claude Code to implement."

**Your time:** 2 minutes to review. Then either ignore or open Claude Code and say "build food-safety" to implement.

### Task 6: Monthly Pricing Optimiser
**Schedule:** 1st of each month at 9:00 AM
**What it does:**
- Analyses 30 days of query volume, revenue, and abandoned-402 data per product
- Calculates optimal price points using simple elasticity: if volume is high and abandonment is low, suggest price increase; if volume is zero, suggest price decrease or free trial period
- Compares against any competitor pricing found in weekly scans
- Generates recommendations saved to `~/DevDrops/ops/reports/pricing-YYYY-MM.md`
- Example: "Predictions feed: 940 queries at $0.01 = $9.40. Abandonment rate: 8% (low). Recommend: increase to $0.012. Expected impact: ~5% volume drop, ~12% revenue increase. Weather: 1,200 queries at $0.003 = $3.60. Abandonment rate: 2% (very low). Recommend: increase to $0.005."

**Your time:** 3 minutes to approve. Cowork updates the x402 middleware pricing config and Claude Code deploys.

---

## Cloudflare Workers Autopilot (runs 24/7, no Mac Mini needed)

These are cron-triggered Workers that run on Cloudflare's infrastructure regardless of your Mac Mini's status.

### Health Monitor Worker
**Schedule:** Every 30 minutes
**What it does:**
- Pings every upstream data source API with a test request
- If 3 consecutive failures: auto-switches that product to its backup data source
- Logs health status to D1 `health_log` table
- If critical failure (no backup available): disables endpoint, sends Telegram alert

### Data Collection Workers
**Schedule:** Varies per data source (5min / hourly / daily)
- Weather cache refresh: every hour
- Prediction market prices: every 5 minutes
- Sports odds: every 5 minutes (within Odds API rate limits)
- Companies House filings: hourly streaming check
- Financial calendar: daily sync
- FX rates: daily (ECB publishes once daily)
- GeoLite2 database: monthly download to R2

### Transaction Logger Worker
**Schedule:** Continuous (runs on every paid request)
- Logs every x402/MPP payment: timestamp, product, amount, agent wallet/ID
- Logs every abandoned 402: timestamp, product, price shown, no payment received
- Data stored in D1 `transactions` and `abandoned_402s` tables
- This is the data that Cowork's daily digest and weekly review analyse

### Nightly Backup Worker
**Schedule:** Daily at 2:00 AM UTC
- Exports all D1 tables as JSON to R2 bucket `/backups/YYYY-MM-DD/`
- Verifies export integrity (row counts match)
- Deletes backups older than 90 days from R2 (D1 Time Travel covers 30 days, R2 backups cover 90 days)

---

## Self-Improvement Loop

The system improves itself through three feedback mechanisms:

### 1. Abandoned 402 Analysis
Every time an agent queries an endpoint, gets the 402 price, and walks away, that's logged. The weekly review analyses these patterns:
- High abandonment + high volume = price too high → pricing optimiser suggests decrease
- High abandonment + low volume = poor discoverability or unclear schema → suggest improving Bazaar metadata
- Zero queries at all = product not being found → suggest improving descriptions or removing from Bazaar

### 2. Error-Driven Source Switching
When a data source fails, the health monitor switches to backup and logs it. The weekly review spots patterns: "Visual Crossing failed 4 times this week during peak US hours — consider making OpenWeatherMap the primary for US timezone queries." Over time, the system learns which sources are reliable at which times.

### 3. Product Discovery → Build → Monitor Loop
The fortnightly scout finds opportunities. You approve. Claude Code builds. The daily digest monitors performance. The weekly review recommends adjustments. The pricing optimiser tunes prices. This creates a continuous cycle:

Discover gap → Draft product → Build → Deploy → Monitor → Adjust → Repeat

Your role reduces to: approve/reject recommendations on Sunday mornings. Everything else is automated.

---

## Your Weekly Time Commitment

| Day | Task | Time |
|-----|------|------|
| Monday–Saturday | Glance at daily Telegram digest | 10 sec/day |
| Sunday | Read weekly review, approve recommendations | 15 min |
| Ad hoc | Read Telegram alerts (only when something breaks) | 0-5 min |
| Fortnightly | Review product opportunity, say "build X" if approved | 5 min |
| Monthly | Review pricing recommendations, approve | 3 min |
| **Total weekly average** | | **~20 minutes** |

When you want to actively develop (build new products, improve existing ones, work on the landing page), Claude Code is there. But the system doesn't depend on your active involvement to operate, earn revenue, and improve itself.

---

## Dispatch (bonus capability)

Cowork now includes a Dispatch feature — you can assign tasks to Claude from your phone and it executes them on your Mac Mini. This means if you see an opportunity while out (e.g., a new data source mentioned on Twitter), you can text Claude: "Research the UK Food Standards API and draft a product spec for DevDrops" — and come home to find the spec written and waiting for your review.

---

## Security Notes for Always-On Mac Mini

- Enable FileVault disk encryption
- Set up automatic macOS updates
- Claude Desktop Cowork runs in sandboxed folder access — only `~/DevDrops/` is accessible
- Store no sensitive credentials in the DevDrops folder — use Cloudflare Workers environment variables for API keys
- Cowork is still in research preview — Anthropic warns it can take destructive actions. Point it only at the `~/DevDrops/ops/` folder, not your home directory
- Review Cowork's planned actions before approving execution on any task that modifies deployed code
- The Mac Mini does NOT need to be exposed to the internet — all Cloudflare interactions happen via outbound API calls, not inbound connections
