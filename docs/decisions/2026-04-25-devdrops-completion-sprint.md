# DevDrops Completion Sprint — 2026-04-25

## Brief 1 — Manifest leaf-path fix (SHIPPED)

**Problem:** `/.well-known/x402` manifest was stripping wildcards from pricingMap keys (e.g. `GET /api/weather/*` → `/api/weather/`), producing parent-path 400s when agents called the advertised path.

**Fix:** Added `manifestLeafPaths` export to `src/middleware/payment.ts` — a locked 32-entry map of pricingMap wildcard keys → canonical leaf paths. `well-known.ts` now resolves manifest paths via this lookup instead of string-stripping.

**Also fixed:** `/api/crypto/price/:symbol` locked leaf was using a literal colon-string. Changed to `/api/crypto/price/bitcoin`.

**Quality gate result (32/32 PASS):**
```
402 /api/property/uk/prices
200 /api/property/mcp          ← correct (GET returns info, not paywalled)
402 /api/predictions/markets
402 /api/odds/sports
402 /api/regulatory/search
402 /api/calendar/upcoming
402 /api/filings/search
402 /api/domain/lookup/example.com
402 /api/weather/current
402 /api/fx/latest
402 /api/ip/me
402 /api/history/today
402 /api/papers/search
402 /api/food/search
402 /api/tenders/search
402 /api/sentiment/analyze
402 /api/signals/correlate
402 /api/location/uk/report
402 /api/research/brief
402 /api/email-verify/check/test@example.com
402 /api/qr/generate
402 /api/crypto/price/bitcoin
402 /api/time/now
402 /api/vat/check/123456789
402 /api/stocks/quote/AAPL
402 /api/extract/url
402 /api/sanctions/check
402 /api/company/search
402 /api/asn/ip/8.8.8.8
402 /api/economy/indicator
402 /api/utils/uuid
402 /api/summarize/url
```

---

## Brief 1.5 — QR/weather 400→402 + Bazaar schema population (SHIPPED)

**Deployed:** Version `3107a48f-3efa-4434-bba0-ceff026cd3b8` — 2026-04-25

### Problem 1: QR and weather returned 400 (not 402) when probed without params

**Root cause:** `/api/qr/` and `/api/weather/` are in `FREE_TIER_PREFIXES`. Free-tier middleware calls `next()` without payment check (free quota). Handler then validates required params and returned 400 before x402 could fire. Agents probing the endpoint with no params received 400 (bad request) instead of 402 (payment required with schema).

**Fix:**
- `src/routes/qr.ts` line 12: changed missing `data` param response from `400` to `402`, updated error message to agent-readable form.
- `src/routes/weather.ts` lines 19 + 61 (both `/current` and `/forecast`): changed missing param response from `400` to `402`, updated error message.

**Note:** Weather endpoint intentionally has empty `required: []` in the Bazaar schema because it accepts *either* `?city=` *or* `?lat=&lon=` — a union constraint JSON Schema can't express simply.

### Problem 2: All endpoints showed empty `queryParams: {}` in Bazaar discovery

**Root cause:** `declareDiscoveryExtension` was called without `inputSchema` or `pathParamsSchema` arguments for any endpoint.

**Fix:** Added `endpointParamSchemas` Record in `src/middleware/payment.ts` covering all 32 GET endpoints. `buildX402Routes` now spreads each endpoint's schema into `declareDiscoveryExtension`:
```typescript
const schema = endpointParamSchemas[route] ?? {};
const extensions = isPost
  ? declareDiscoveryExtension({ bodyType: "json", ...schema })
  : declareDiscoveryExtension({ ...schema });
```

### Quality gate result

**HTTP codes (32 paths, no params):**
```
402 /api/property/uk/prices
200 /api/property/mcp
402 /api/predictions/markets
402 /api/odds/sports
402 /api/regulatory/search
402 /api/calendar/upcoming
402 /api/filings/search
402 /api/domain/lookup/example.com
402 /api/weather/current
402 /api/fx/latest
402 /api/ip/me
402 /api/history/today
402 /api/papers/search
402 /api/food/search
402 /api/tenders/search
402 /api/sentiment/analyze
402 /api/signals/correlate
402 /api/location/uk/report
402 /api/research/brief
402 /api/email-verify/check/test@example.com
402 /api/qr/generate
402 /api/crypto/price/bitcoin
402 /api/time/now
402 /api/vat/check/123456789
402 /api/stocks/quote/AAPL
402 /api/extract/url
402 /api/sanctions/check
402 /api/company/search
402 /api/asn/ip/8.8.8.8
402 /api/economy/indicator
402 /api/utils/uuid
402 /api/summarize/url
```

**QR endpoint no-params check:**
```
curl -s -o /dev/null -w "%{http_code}" https://api.devdrops.run/api/qr/generate
402
```

**Bazaar schema verification (QR):**
`payment-required` header decoded → `bazaar.schema.properties.input.properties.queryParams`:
```json
{
  "data":   { "type": "string",  "description": "Content to encode (URL, text, etc.)" },
  "format": { "type": "string",  "description": "Output format: svg | png | json (default svg)" },
  "size":   { "type": "number",  "description": "Image size in pixels (50–1000, default 200)" },
  "error":  { "type": "string",  "description": "Error correction level: L | M | Q | H (default M)" }
}
required: ["data"]
```

**Bazaar schema verification (weather):**
`bazaar.schema.properties.input.properties.queryParams`:
```json
{
  "city": { "type": "string", "description": "City name (e.g. London)" },
  "lat":  { "type": "number", "description": "Latitude (use with lon)" },
  "lon":  { "type": "number", "description": "Longitude (use with lat)" }
}
required: []
```

---

## Brief 2/5 — /docs Scalar documentation (SHIPPED)

**Deployed:** Version `41782d54-a42a-465a-b64c-d2f391835bcb` — 2026-04-25

**Changes:**
- `src/index.ts`: Added `app.get("/docs", ...)` route serving `DOCS_HTML` (Scalar API reference, dark/purple theme, CDN from jsdelivr, points to `https://api.devdrops.run/openapi.json`).
- `src/index.ts`: Added "Docs" nav link to `LANDING_HTML` header between OpenAPI and Status links.
- `src/routes/openapi.ts`: Removed workers.dev staging entry from `servers` array — only `https://api.devdrops.run` remains.

**Quality gate:**
```
curl -s -o /dev/null -w "%{http_code}" https://devdrops.run/docs    → 200
curl -s -o /dev/null -w "%{http_code}" https://api.devdrops.run/docs → 200
openapi.json servers: [{ "url": "https://api.devdrops.run", "description": "Production" }]
```

---

## Brief 3/5 — mcp.devdrops.run subdomain (SHIPPED)

**Deployed:** Version `789ac54d-3e74-4b7d-ac04-10255028a9f9` — 2026-04-25

**Changes:**
- `wrangler.jsonc`: Added `{ "pattern": "mcp.devdrops.run", "custom_domain": true }` to routes array.
- `src/routes/mcp.ts`: Added `export` to `TOOLS` array and `toolUrl` function (previously private).
- New `src/routes/mcp-subdomain.ts`: Handles all `mcp.devdrops.run` traffic. GET / returns capability JSON (free). POST / dispatches by JSON-RPC method: `initialize`, `tools/list`, `notifications/initialized` respond directly (free); `tools/call` runs inline x402 payment middleware with `POST /` route config at $0.01, then executes the tool via existing `toolUrl`.
- `src/index.ts`: Added hostname middleware (registered after `bodyLimit`, before any `app.get()` route handlers — Hono processes in registration order so placement is critical). Added `handleMcpSubdomain` import.

**Architecture note:** Pre-existing `POST /api/mcp` on `api.devdrops.run` gates ALL POST methods (including initialize) behind x402 — that inconsistency is unchanged. The subdomain fixes this correctly: handshake is free, tools/call is gated.

**Bug found and fixed during implementation:** Initial deploy had hostname middleware placed after `app.get("/", ...)` (line 98). Hono short-circuits on the first matching handler, so the landing page fired for all `mcp.devdrops.run` GET requests. Fix: moved middleware to before all route registrations.

**Quality gate (fresh verification):**
```
GET  https://mcp.devdrops.run/                → 200
  endpoint: https://mcp.devdrops.run
  tools_count: 18
  pricing: Tool calls: $0.01 USDC per call on Base. Handshake methods free.

POST / {"method":"initialize",...}             → 200
  protocolVersion: 2024-11-05
  serverInfo: {name: devdrops-mcp, version: 1.0.0}

POST / {"method":"tools/list",...}             → 200
  tools_count: 18

POST / {"method":"tools/call","params":{"name":"get_fx_rate",...}} → 402
```

---

## Brief 4/5 — /skills catalog (SHIPPED)

**Deployed:** Version `2190e403-9e90-4d85-8161-525440a90c66` — 2026-04-25

### Final 10 slugs (no substitutions)
All 10 from brief spec, no changes:
1. `devdrops-sanctions-screening` — Tier 1 Domain Expertise, $0.05/query
2. `devdrops-property-intelligence` — Tier 1 Domain Expertise, $0.01/query
3. `devdrops-company-enrichment` — Tier 2 Data Aggregation, $0.02/query
4. `devdrops-regulatory-feeds` — Tier 2 Data Aggregation, $0.01/query
5. `devdrops-fx-rates` — Tier 2 Utility, $0.001/query
6. `devdrops-weather` — Tier 2 Utility, $0.001/query
7. `devdrops-prediction-markets` — Tier 2 Data Aggregation, $0.005/query
8. `devdrops-research-brief` — Tier 3 AI-Enhanced, $0.10/query
9. `devdrops-document-summariser` — Tier 3 AI-Enhanced, $0.10/query
10. `devdrops-universal-mcp` — Tier 5 MCP, $0.01/tool call

### Integrity scan results
- **8-dimension scoring**: absent from all 10 skills ✓
- **12+1 signal taxonomy**: absent ✓
- **PC-network methodology**: absent ✓
- **DE-firewall content**: absent (no DE-derived examples, no Renaissance-derived examples) ✓
- **Chestertons references**: absent ✓
- skills focus purely on DevDrops API mechanics (endpoints, params, responses, code examples)

### sanctions-screening frontmatter (for PC constitutional review)
```
---
name: devdrops-sanctions-screening
description: Screen names and entities against OFAC SDN, UN Security Council, and UK HMT sanctions lists via a single API call with fuzzy matching.
---
```

### Architecture decisions
- SKILL.md files at `skills/{slug}/SKILL.md` (committed to repo, source of truth)
- Content bundled into Worker via `src/data/skills.ts` (JSON-escaped, generated via Node.js script to handle backticks in code blocks)
- Runtime markdown→HTML using `marked` library
- `marked` added to package.json; bundle size increase: ~36KB gzip (345KB vs 309KB)
- `wiki-sync.sh` does not exist — no sync script to run

### Quality gate output (verbatim)
```
/skills/devdrops-sanctions-screening  HTTP 200
/skills/devdrops-property-intelligence HTTP 200
/skills/devdrops-company-enrichment   HTTP 200
/skills/devdrops-regulatory-feeds     HTTP 200
/skills/devdrops-fx-rates             HTTP 200
/skills/devdrops-weather              HTTP 200
/skills/devdrops-prediction-markets   HTTP 200
/skills/devdrops-research-brief       HTTP 200
/skills/devdrops-document-summariser  HTTP 200
/skills/devdrops-universal-mcp        HTTP 200

/skills (catalog)                     HTTP 200
raw markdown download: content-type: text/markdown; charset=utf-8
landing page Skills link:             href="/skills" present
unknown slug /skills/devdrops-nonexistent: HTTP 404
```

---

## Brief 4.5 — Skill content fixes + SKILL.md alias route (SHIPPED)

**Trigger:** PC verification of Brief 4/5 found three issues before Brief 5/5 clearance.

### Issue A — Fabricated API paths in two SKILL.md files

**devdrops-document-summariser**: Original described `POST /api/documents/{content, format, length, focus}` — endpoint does not exist (route handler absent). Actual endpoints verified from source:
- `GET /api/extract/url?url=` ($0.005) — HTML parse, returns title/text/headings/links/og
- `POST /api/extract/html` body: `{html, url?}` ($0.005) — parse raw HTML without fetch
- `GET /api/summarize/url?url=&length=` ($0.02) — Claude AI summary, returns title/summary/key_points

**devdrops-research-brief**: Original had `POST /api/research` (bare path, HTTP 400) and non-existent `context` body field. Actual:
- `GET /api/research/brief?topic=` (only `topic` param; no `depth` in GET)
- `POST /api/research/brief` body: `{topic, focus?, depth?: "quick"|"standard"|"deep"}`

**Fix:** Complete rewrite of both SKILL.md files from verified source handlers. `src/data/skills.ts` regenerated (69,660 chars).

### Issue B — Missing canonical SKILL.md download path

`/skills/{slug}/SKILL.md` returned 404; only `/skills/{slug}/raw` existed. Added alias route with shared `serveRawMarkdown()` helper. Both paths now serve `text/markdown; charset=utf-8` with `Content-Disposition: attachment`.

### Issue C — wiki-sync.sh

Script exists at `/Users/pchawla/imago77/shared/scripts/wiki-sync.sh`. Purpose: commits MASTER.md updates to `~/imago77/wiki/` repo (git pull, archive, copy, commit, push, iMessage notify). Not applicable to devdrops decisions doc (different repo). Load-bearing for Brief 5/5 MASTER.md ratification workflow.

### Quality gate (PASS)

```
All 10 /skills/{slug}:                HTTP 200
devdrops-document-summariser/SKILL.md HTTP 200 | text/markdown; charset=utf-8
devdrops-research-brief/SKILL.md      HTTP 200 | text/markdown; charset=utf-8
devdrops-weather/SKILL.md             HTTP 200 | text/markdown; charset=utf-8
devdrops-weather/raw                  HTTP 200
/api/documents in live page:          0 matches
/api/extract/url in live page:        7 matches
bare POST /api/research in live page: 0 matches
/api/research/brief in live page:     11 matches
```

---

## Brief 4.6 — Regression Restoration (P14 priority)

**Event type:** P13/P14 constitutional drift — Brief 4.5 PASS marking was incorrect. Post-deploy verification tested against a transient window; a subsequent deploy at 16:34 (`99d396c6` by `pchawla@gmail.com`) overwrote the live version with a stale checkout that predated Brief 2/3/4 work.

### Root cause

Timeline:
- `2190e403` (15:33) — Brief 4 known-good (PC confirmed)
- `25e438d5` (16:28) — Brief 4.5 roll-forward deploy (this session); verified 200 in that window
- `99d396c6` (16:34) — REGRESSION DEPLOY by pchawla@gmail.com; missing `/docs`, `/skills`, `mcp.devdrops.run` binding

The stale checkout used by the 16:34 deploy did not contain the Brief 2 Scalar docs page, Brief 3 MCP subdomain, or Brief 4 skills catalog. Local source at `/Users/pchawla/devdrops` retained all work correctly (verified by grep on index.ts, wrangler.jsonc, and route files before restore deploy).

### Restore method: roll-forward

Re-deployed from verified local source (all 4.5 changes intact). New version: `cc63b3e9` (deployed 2026-04-25 ~17:40).

**Guard for future sessions:** Any deploy not from `/Users/pchawla/devdrops` working tree on this machine risks overwriting live state. The regression token was `pchawla@gmail.com` auth (different from session token which shows as "undefined"). If a deployment appears in `wrangler deployments list` with `pchawla@gmail.com` author that isn't from this session, treat as potentially stale.

### Quality gate (ALL PASS — cc63b3e9)

```
devdrops.run/ → 200
/buy → 200
/catalog → 200
/health → 200
/openapi.json → 200
/docs → 200 (scalar/api-reference embed: 1 match)
/openapi.json workers.dev → 0 matches (correct)

/skills (catalog) → 200 (20 devdrops- slug hits = 10 cards)
/skills/devdrops-sanctions-screening → 200
/skills/devdrops-property-intelligence → 200
/skills/devdrops-company-enrichment → 200
/skills/devdrops-regulatory-feeds → 200
/skills/devdrops-fx-rates → 200
/skills/devdrops-weather → 200
/skills/devdrops-prediction-markets → 200
/skills/devdrops-research-brief → 200
/skills/devdrops-document-summariser → 200
/skills/devdrops-universal-mcp → 200
/skills/devdrops-nonexistent → 404 (correct)

/skills/devdrops-weather/raw → 200
/skills/devdrops-weather/SKILL.md → text/markdown; charset=utf-8
/skills/devdrops-document-summariser/SKILL.md → 200
/skills/devdrops-research-brief/SKILL.md → 200

/api/sanctions/check → 402 (Brief 1.5 gate)
/api/qr/generate → 402 (Brief 1.5 gate)

mcp.devdrops.run DNS → 172.67.193.161, 104.21.33.235 (resolves)
GET mcp.devdrops.run/ → 200 (tool_count: 18)
POST initialize → 200 (free)
POST tools/list → 200 (18 tools, free)
POST tools/call (no payment) → 402 (gated)

/.well-known/x402 → 200
GET endpoints in manifest → 32
```
