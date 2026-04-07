# DevDrops — Audit Fix List (Prioritised)

> **For Claude Code:** Execute these fixes in order. Each has been verified against the audit findings. Commit after each batch. Update wiki/STATE.md as you go.

---

## BATCH 1: Critical fixes (do these in the next hour)

### Fix 1.1 — Translate endpoint broken and bypassing payment
**Impact:** Customers can call this endpoint for free; it then crashes.

**File:** `src/routes/translate.ts`

**Change:** Rename the main route from `post("/")` to `post("/text")`.

```typescript
// Find this:
translate.post("/", async (c) => { ... });

// Change to:
translate.post("/text", async (c) => { ... });
```

Update any cache key references that reference the old path. Then update `src/routes/openapi.ts` to change the `/api/translate` path to `/api/translate/text`. Also update `src/index.ts` if it documents the path anywhere.

**Verify:** `curl -X POST https://api.devdrops.run/api/translate/text` should return 402.

---

### Fix 1.2 — LibreTranslate URL doesn't work without API key
**Impact:** Even after Fix 1.1, the translate endpoint will fail because libretranslate.com requires a paid key.

**File:** `src/routes/translate.ts`

**Recommended option:** Replace LibreTranslate with MyMemory (free, no key, 1k/day):

```typescript
// Replace the LibreTranslate fetch with:
const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${source}|${target}`;
const response = await fetch(url);
const data = await response.json();
const translatedText = data?.responseData?.translatedText;
```

Update the response shape to match.

**Verify:** A real (test) translation returns translated text, not an error.

---

### Fix 1.3 — SAM.gov and USDA FDC using DEMO_KEY
**Impact:** `/api/tenders` and `/api/food` will hit rate limits within hours of any traffic.

**Step 1:** Register for free API keys:
- SAM.gov: https://sam.gov/content/entity-information → Request API Key
- USDA FDC: https://fdc.nal.usda.gov/api-guide.html → Get API Key

**Step 2:** Add as Wrangler secrets:
```bash
echo "your_sam_gov_key" | npx wrangler secret put SAM_GOV_API_KEY --env=""
echo "your_fdc_key" | npx wrangler secret put FDC_API_KEY --env=""
```

**Step 3:** Update `src/types.ts` to add:
```typescript
SAM_GOV_API_KEY: string;
FDC_API_KEY: string;
```

**Step 4:** Update `src/routes/tenders.ts:91` and `src/routes/food.ts:103`:
```typescript
// Replace api_key=DEMO_KEY with:
api_key=${c.env.SAM_GOV_API_KEY}
// and
api_key=${c.env.FDC_API_KEY}
```

**Verify:** A test query to each endpoint returns real data, not a rate-limit error.

---

## BATCH 2: Discovery & visibility (do these today)

### Fix 2.1 — Enable Bazaar discoverability
**Impact:** This is the single most important fix for getting agents to find you. Currently DevDrops is invisible to the CDP Bazaar.

**File:** `src/middleware/payment.ts`

**Change:** In the `buildX402Routes` function (or wherever the route config is constructed), add `discoverable: true` and rich metadata:

```typescript
extensions: {
  bazaar: {
    discoverable: true,
    inputSchema: { ... },  // copy from existing OpenAPI definitions
    outputSchema: { ... }, // same
  }
}
```

Check `@x402/hono` docs for exact field names. The pattern is documented at https://docs.cdp.coinbase.com/x402/bazaar.

**Verify:** After deploying, query `https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources` and confirm DevDrops endpoints appear in the results.

---

### Fix 2.2 — mimeType empty in 402 responses
**Impact:** Some Bazaar implementations may deprioritise endpoints with empty mimeType.

**File:** `src/middleware/payment.ts`

**Change:** In the route config builder, add `mimeType: "application/json"` to each route. Check the @x402/hono docs for the exact field name.

**Verify:** `curl -I https://api.devdrops.run/api/fx/latest` returns a 402 response with `"mimeType": "application/json"`.

---

### Fix 2.3 — Clean up stale data sources
**Impact:** The health-check cron is wasting cycles pinging Amadeus, Adzuna, and EasyPost APIs for products that don't exist.

**Step 1:** Run this against D1:
```bash
npx wrangler d1 execute devdrops --remote --command="DELETE FROM data_sources WHERE product IN ('flights', 'jobs', 'shipping');"
```

**Step 2:** Edit `src/db/seeds.sql` to remove the INSERT blocks for flights, jobs, and shipping.

**Verify:** `npx wrangler d1 execute devdrops --remote --command="SELECT product FROM data_sources;"` shows no rows for the dropped products.

---

## BATCH 3: First-time developer experience (do this within a week)

### Fix 3.1 — Add a Quick Start section to the landing page
**Impact:** Closes the gap between "this looks interesting" and "I made my first paid request."

**File:** `src/index.ts` (the LANDING_HTML constant)

**Add a new section after the products list:**

```html
<section id="quickstart">
  <h2>Quick start</h2>

  <h3>Option 1: Try with curl (raw 402 flow)</h3>
  <pre><code>curl https://api.devdrops.run/api/fx/latest
# Returns HTTP 402 with payment instructions in the body</code></pre>

  <h3>Option 2: Pay automatically with @x402/fetch (Node.js)</h3>
  <pre><code>npm install @x402/fetch viem

import { fetchWithPayment } from '@x402/fetch';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const account = privateKeyToAccount('0xYOUR_PRIVATE_KEY');
const wallet = createWalletClient({ account, chain: base, transport: http() });

const response = await fetchWithPayment(
  'https://api.devdrops.run/api/fx/latest',
  { wallet }
);
const data = await response.json();</code></pre>

  <h3>Option 3: Test on Base Sepolia (free)</h3>
  <p>Get free test USDC from <a href="https://faucet.circle.com/">Circle's faucet</a>, then point your client at our test endpoints.</p>

  <h3>New to crypto wallets?</h3>
  <ol>
    <li>Install <a href="https://www.coinbase.com/wallet">Coinbase Wallet</a> or <a href="https://metamask.io/">MetaMask</a></li>
    <li>Buy a small amount of USDC on Base via Coinbase, Uphold, or any major exchange</li>
    <li>Use the wallet's private key with @x402/fetch as shown above</li>
  </ol>
</section>
```

**Verify:** The landing page now has a clear path from zero to first paid request.

---

### Fix 3.2 — Add a contact/support method
**Impact:** Currently no way for users to ask questions or report bugs.

**File:** `src/index.ts` (LANDING_HTML)

**Change:** Add to the footer:

```html
<footer>
  ...existing content...
  <p>
    Issues? <a href="https://github.com/metamorphosis-sre/devdrops/issues">Open a GitHub issue</a>
    or email <a href="mailto:support@devdrops.run">support@devdrops.run</a>
  </p>
</footer>
```

If you don't want to set up support@devdrops.run yet, just use the GitHub issues link. Make the repo public-issues-only (issues visible, code private) or create a separate public issues repo.

---

### Fix 3.3 — Create README.md in repo root
**Impact:** GitHub shows an empty page when anyone opens the repo.

**File:** `README.md` (new)

```markdown
# DevDrops

Pay-per-query data APIs for AI agents. No accounts, no API keys, no subscriptions.

**Live:** https://devdrops.run
**API:** https://api.devdrops.run
**Docs:** https://api.devdrops.run/openapi.json
**Catalog:** https://api.devdrops.run/catalog

22 production endpoints serving prediction markets, sports odds, financial data, regulatory filings, weather, FX rates, AI sentiment, and more — all paid via x402 micropayments on Base mainnet.

## Quick start
See https://devdrops.run for client examples.

## Architecture
- Cloudflare Workers (Hono framework)
- D1 (SQLite at edge) for caching and analytics
- KV for hot data
- x402 payment middleware via @x402/hono
- Coinbase CDP facilitator for payment verification

## Documentation
- Project wiki: `wiki/PROJECT.md`
- Current state: `wiki/STATE.md`

## Deploy
```bash
npm install
npx wrangler deploy
```

Configuration in `wrangler.toml`. Secrets via `wrangler secret put`.
```

---

### Fix 3.4 — Remove _template.ts from repo
**File:** `src/routes/_template.ts`
**Action:** `git rm src/routes/_template.ts && git commit -m "Remove dev scaffold"`

---

## BATCH 4: Robustness fixes (do this within a week)

### Fix 4.1 — Add body size limit to /documents/extract
**File:** `src/routes/documents.ts`

In the extract handler, add:
```typescript
if (!body.text || body.text.length < 50) return c.json({ error: "Text too short (minimum 50 characters)" }, 400);
if (body.text.length > 100000) return c.json({ error: "Text too long (maximum 100,000 characters)" }, 400);
```

---

### Fix 4.2 — Add bare-path helpers (improve DX)
**Impact:** Currently calling `/api/property` returns 404 with no guidance.

For each router file, add a root handler:

```typescript
property.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: ["/api/property/valuation", "/api/property/comparables", "/api/property/history"]
}, 400));
```

Do this for all 22 product routers.

---

### Fix 4.3 — Move hot caching to KV
**Impact:** D1 cache reads are ~50ms; KV reads are ~1-2ms at edge.

**File:** `src/lib/cache.ts`

For high-volume read products (FX, weather, IP, crypto, history), add KV caching layer:

```typescript
export async function getCachedKV(env: Env, key: string): Promise<any | null> {
  const cached = await env.CACHE.get(key, 'json');
  return cached;
}

export async function setCacheKV(env: Env, key: string, value: any, ttlSeconds: number) {
  await env.CACHE.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
}
```

Then in `src/routes/fx.ts`, `weather.ts`, `ip.ts`, `history.ts`: try KV first, fall back to D1, write through to KV after upstream fetch.

---

## BATCH 5: Polish (do these when convenient)

- Fix 5.1: Set up GitHub Actions CI/CD (`.github/workflows/deploy.yml`) — TypeScript check on PR, deploy on push to main
- Fix 5.2: Write basic integration smoke tests using vitest + hono test utilities
- Fix 5.3: Add `product` column to `health_log` table for easier analytics
- Fix 5.4: Apply for Stripe MPP early access (https://docs.stripe.com/payments/machine)
- Fix 5.5: Once R2 is provisioned (Cloudflare ticket), test the backup cron manually
- Fix 5.6: Publish the Property MCP manifest to the MCP registry

---

## After all fixes

Re-run the audit and update STATE.md:
1. Re-test all 22 endpoints
2. Re-query the CDP Bazaar discovery endpoint to confirm DevDrops appears
3. Trigger one full testnet payment cycle on Base Sepolia to verify the entire flow end-to-end (this is the only thing that hasn't been tested in production)
4. Update wiki/STATE.md with the new pass/fail counts

The aim is to get from 73 PASS / 23 WARNING / 23 FAIL → at least 95 PASS / 15 WARNING / 5 FAIL before any public marketing push.

---

## Critical reminder

**Until Fix 1.1 ships, the translate endpoint is giving away free LibreTranslate calls.** Do that one first, even before reading the rest of this document.
