# DevDrops Production Audit

Date: 2026-05-06

## Executive Status

DevDrops is live as a Cloudflare Workers/x402 API product. The current production metadata surfaces report 43 products/endpoints, not the older 22/25/30-module counts in legacy docs.

Live surfaces checked:

- `https://api.devdrops.run/health`
- `https://api.devdrops.run/catalog`
- `https://api.devdrops.run/openapi.json`
- `https://api.devdrops.run/.well-known/x402`
- `https://api.devdrops.run/.well-known/mcp.json`
- `https://api.devdrops.run/.well-known/mcp/server-card.json`

## Endpoint Count Reconciliation

| Source | Count | Status |
|---|---:|---|
| Legacy wiki launch copy | 22 | Superseded |
| Later wiki state | 30 | Superseded |
| README before this audit | 25 | Superseded |
| Production `/catalog` | 43 | Current source of truth |
| Production OpenAPI positioning | 43 | Current |
| Production x402 manifest positioning | 43 | Current |

The 43 count includes utility wrappers, AI endpoints, MCP, and credit bundle products. Utility wrappers remain in scope because accountless wallet-payable wrappers are part of the DevDrops product.

## Live Infrastructure

| Component | Observed status | Notes |
|---|---|---|
| Worker | Live | `api.devdrops.run` responds |
| D1 | ok | `/health` reports D1 ok |
| KV | ok | `/health` reports KV ok |
| R2 | not_configured | Optional backup binding is absent; backup cron skips safely |
| x402 manifest | live | `/.well-known/x402` responds |
| OpenAPI | live | `/openapi.json` responds |
| Catalog | live | `/catalog` reports 43 products |
| MCP manifest | live | `/.well-known/mcp.json` and server card respond |

## Payment And Settlement

- x402 middleware is mounted for `/api/*` product routes.
- Checkout/webhook and selected discovery routes intentionally bypass x402.
- Production network is Base mainnet: `eip155:8453`.
- Facilitator URL points to Coinbase CDP x402.
- No wallet/private keys are stored in the repository.
- No paid transaction was run during this audit.

## Cost Exposure

| Area | Cost posture |
|---|---|
| Cloudflare Workers/D1/KV | expected platform cost |
| R2 backups | currently skipped because binding is absent |
| Claude/AI routes | paid per actual request; no audit run called paid AI |
| The Odds API | configured as paid upstream in docs |
| Workers AI routes | paid platform feature if called |
| Metadata smoke | free surfaces only |

## Security And Safety Risks

- Secret values are referenced only as environment bindings, not committed.
- `wrangler.toml` and `wrangler.jsonc` contain non-secret public config, including the public pay-to wallet address.
- `/health` now exposes backup readiness without secret values.
- Admin sanctions refresh route requires cron context or `ADMIN_SECRET`.

## Observability Gaps

- R2 backup readiness was previously only visible in logs; `/health` now includes a `backup` diagnostic object.
- Live smoke tests cover free metadata and selected route behavior, but there is no automated paid-transaction test.
- There is no customer-facing revenue dashboard yet.

## Revenue And Distribution Blockers

- R2 backup binding remains absent.
- x402scan appearance still depends on a first paid transaction.
- External marketplace PRs need periodic manual review.
- MCP registry submission should use the existing manifests.

## Validation Commands

```bash
npm run typecheck
npm test
npm run smoke:metadata
npx wrangler deploy --dry-run
```

No destructive D1 changes, paid upstream changes, real AI calls, or wallet/private-key exposure were performed in this audit.
