# DevDrops — End-to-End Audit Checklist

**Purpose:** Run this checklist via Claude Code to verify everything is working correctly. Save the results to `audit-results.md` and share with me for review.

**How to use:** In your Claude Code terminal, paste this entire file content and say:

> "Execute every check in this audit. Run the actual commands, capture the actual output, and save findings to `~/DevDrops/audit-results.md`. Don't skip anything. Mark each check as PASS, FAIL, or WARNING with the actual evidence."

---

## SECTION 1: Live Site Checks

### 1.1 Landing page accessibility
- [ ] `curl -I https://devdrops.run` — returns 200 OK?
- [ ] `curl -I https://www.devdrops.run` — returns 200 OK?
- [ ] Both URLs serve the same landing page?
- [ ] HTTPS certificate valid?
- [ ] Page loads in under 2 seconds?

### 1.2 Landing page content
- [ ] Does the page clearly explain what DevDrops is?
- [ ] Is there a list of available products/endpoints?
- [ ] For each product, is the price clearly shown?
- [ ] Is there a "How it works" section explaining x402 to a non-crypto-native developer?
- [ ] Is there a documentation link or section?
- [ ] Is there a contact method (email, GitHub, Discord)?
- [ ] Mobile responsive check — does it look right at 375px width?

### 1.3 Documentation completeness
- [ ] Does each endpoint have its own documentation page?
- [ ] For each endpoint: clear description, pricing, request format, response schema, example curl command, example response
- [ ] Is there a "Getting started" guide that walks an agent developer through making their first paid request?
- [ ] Does the docs explain what x402 is for developers who haven't used it before?
- [ ] OpenAPI/Swagger spec available at `/openapi.json` or similar?

---

## SECTION 2: API Endpoint Checks

For EACH live product endpoint, run these checks. List the endpoints actually deployed, then test each one.

### 2.1 Endpoint discovery
- [ ] Run `wrangler deployments list` — list every Worker deployed
- [ ] Run `wrangler tail [worker-name]` briefly to confirm logs work
- [ ] List every route configured in `wrangler.toml`

### 2.2 Per-endpoint verification (run for each product)
- [ ] Unauthenticated request returns HTTP 402 Payment Required?
- [ ] 402 response includes proper x402 payment headers (price, recipient address, network, asset)?
- [ ] Payment recipient address matches your configured wallet?
- [ ] Network is set correctly (Base mainnet for production, Base Sepolia for testing)?
- [ ] Asset is USDC on Base?
- [ ] Price matches what's shown on the landing page?
- [ ] Endpoint description is human-readable in the 402 response?

### 2.3 x402 Bazaar discovery
- [ ] Is `discoverable: true` set in the x402 middleware config?
- [ ] Is the endpoint registered with the Coinbase CDP facilitator?
- [ ] Query `https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources` and check if your endpoints appear
- [ ] Each endpoint has descriptive metadata (description, input schema, output schema)?
- [ ] Search x402scan.com for "devdrops" — do your endpoints appear?

### 2.4 Test payment flow (testnet)
- [ ] Have you tested at least one full payment cycle on Base Sepolia testnet?
- [ ] Get test USDC from Circle faucet → send a real x402 payment → verify the endpoint returned data
- [ ] Check the transaction appears on the Base Sepolia block explorer
- [ ] Verify the wallet (payTo address) shows the test USDC received

---

## SECTION 3: Data Source Health

### 3.1 Upstream API verification
For each data source configured, verify:
- [ ] API key is set as a Wrangler secret (not in code)
- [ ] Test query to the upstream returns expected data
- [ ] Free tier rate limits documented
- [ ] Backup data source is configured and tested

### 3.2 Caching layer
- [ ] Is response caching set up (KV or D1) where appropriate?
- [ ] Cache TTLs are sensible per data type (5 min for live odds, 1 hour for filings, etc)?
- [ ] Cache hit/miss is logged?

### 3.3 Cron triggers (for collected data products)
- [ ] List all cron triggers in `wrangler.toml`
- [ ] Verify each cron has run at least once (check Cloudflare dashboard)
- [ ] Verify D1 tables contain recent data from cron jobs

---

## SECTION 4: Payment & Settlement

### 4.1 Wallet configuration
- [ ] What wallet address is configured as `payTo` in the x402 middleware?
- [ ] Is this wallet on Base mainnet or Base Sepolia?
- [ ] Does the wallet match what's documented for users?
- [ ] Is there a test transaction history visible on https://basescan.org for this address?

### 4.2 Coinbase CDP facilitator
- [ ] Is the Coinbase CDP API key set as a Wrangler secret?
- [ ] Has the facilitator URL been configured correctly?
- [ ] Test the facilitator connection (Coinbase CDP has a health check endpoint)

### 4.3 Money flow documentation
- [ ] Is there internal documentation explaining the full money flow: agent → x402 → wallet → Uphold → GBP → Revolut?
- [ ] Are wallet private keys stored securely (NOT in the repo)?

---

## SECTION 5: Client Signup & Usage Flow

### 5.1 First-time developer experience
Pretend you're a developer who just discovered DevDrops. Walk through:
- [ ] Land on devdrops.run — is the value proposition clear in 5 seconds?
- [ ] Find a product I want to use — is the catalog easy to browse?
- [ ] Understand pricing — is it clear what each query costs?
- [ ] Get integration code — is there a copy-paste curl example?
- [ ] Get integration code — is there a JavaScript/Python SDK example using `@x402/fetch` or similar?
- [ ] Understand how to pay — is the wallet setup explained for someone who hasn't used USDC before?
- [ ] Make a test request — can I do this with testnet USDC before committing real money?

### 5.2 Agent experience
For autonomous AI agents discovering DevDrops via the Bazaar:
- [ ] Are endpoint schemas machine-readable (JSON Schema)?
- [ ] Are descriptions clear enough for an agent to understand input/output?
- [ ] Are example requests and responses included in the metadata?
- [ ] Is rate limiting documented (or not — x402 doesn't need rate limits in the traditional sense)?

### 5.3 Support & feedback channels
- [ ] How does a confused user get help? (email, GitHub issues, Discord?)
- [ ] How does a paying user report a bug or wrong data?
- [ ] How do you receive feedback that informs improvements?

---

## SECTION 6: GitHub Repo Checks

### 6.1 Repo structure
- [ ] Is the repo private?
- [ ] Is there a clear README.md explaining the project?
- [ ] Is there a `wiki/` or `docs/` folder with the project docs?
- [ ] Is the wiki being updated as the project evolves?
- [ ] Is `.gitignore` set up to exclude `node_modules`, `.env`, secrets, and `dist/`?
- [ ] Are NO API keys or secrets committed to the repo? (run `git log -p | grep -i "sk-\|api_key\|secret"`)

### 6.2 Code organisation
- [ ] One Worker per product, or modular Hono routes in a single Worker?
- [ ] Is there a shared `lib/` for common code (x402 middleware, error handling, logging)?
- [ ] Are there tests? (even basic ones)
- [ ] Is there a `wrangler.toml` for each Worker or a unified config?

### 6.3 Deployment automation
- [ ] Is there a deploy script (e.g., `npm run deploy:all`)?
- [ ] Is GitHub Actions set up for CI/CD? (optional but nice)
- [ ] How are secrets managed across environments?

### 6.4 Project wiki
- [ ] Does `wiki/PROJECT.md` exist?
- [ ] Does it list every product, its status (live/in-development/planned), and its endpoint URL?
- [ ] Does it record key decisions made during the build?
- [ ] Does it list all configured data sources and their health status?
- [ ] Last updated date — is the wiki being kept current?

---

## SECTION 7: Cloudflare Dashboard Checks

### 7.1 Workers
- [ ] How many Workers are deployed?
- [ ] Total request count in the last 24 hours?
- [ ] Any errors in the last 24 hours? (4xx and 5xx counts)
- [ ] CPU time usage relative to plan limits

### 7.2 D1 databases
- [ ] How many D1 databases exist?
- [ ] Total storage used vs 10GB limit
- [ ] Row counts for key tables (transactions, cached data, health logs)
- [ ] Any failed queries in the logs?

### 7.3 R2 storage
- [ ] Are nightly backups working?
- [ ] How much R2 storage is being used?
- [ ] Are old backups being cleaned up?

### 7.4 KV namespaces
- [ ] How many KV namespaces?
- [ ] Are they being used for caching?

---

## SECTION 8: Security Audit

### 8.1 Secrets management
- [ ] All API keys stored as Wrangler secrets, NOT in code
- [ ] Run `wrangler secret list` for each Worker — document which secrets exist
- [ ] No `.env` files committed to git
- [ ] No private keys in the codebase
- [ ] No hardcoded wallet addresses in test code that could be confused for production

### 8.2 Input validation
- [ ] Do endpoints validate query parameters before processing?
- [ ] Are there size limits on POST request bodies?
- [ ] Is there protection against obvious injection attacks?

### 8.3 Error handling
- [ ] Do errors return user-friendly messages without leaking stack traces?
- [ ] Are errors logged to D1 for the health monitor to track?
- [ ] Do upstream API failures trigger the backup data source?

---

## SECTION 9: Discovery & Marketing Status

- [ ] Is the site listed in x402.org/ecosystem? (submit PR if not)
- [ ] Is the site listed in awesome-x402 GitHub repo? (submit PR if not)
- [ ] Has any first product been queried via the x402 Bazaar discovery layer?
- [ ] Stripe MPP early access — have you applied? Status?

---

## SECTION 10: What's Missing / Recommendations

After running all the above, Claude Code should provide:

1. **Critical issues** — anything broken that needs immediate fixing
2. **High-priority improvements** — things that will materially improve the user/agent experience
3. **Medium-priority improvements** — nice-to-haves for better polish
4. **Low-priority improvements** — long-term quality improvements

For each, include:
- What the issue is
- Why it matters
- The specific file/code/config change needed to fix it
- Estimated effort (5 min, 30 min, 1 hour, etc.)

---

## How to deliver findings back

Save the complete results to `~/DevDrops/audit-results.md` with:

```
# DevDrops Audit Results — [date]

## Section 1: Live Site
[results with PASS/FAIL/WARNING and evidence]

## Section 2: Endpoints
[results]

... etc ...

## Critical Issues Found
[list]

## Recommendations
[prioritised list]
```

Then upload that file back to me and I'll review everything and propose fixes.
