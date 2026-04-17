# DevDrops

Pay-per-query data APIs for AI agents. No accounts, no API keys, no subscriptions — charge per request in USDC on Base, or buy prepaid credit bundles with Stripe.

- **Live:** https://devdrops.run
- **API:** https://api.devdrops.run
- **Catalog (JSON):** https://api.devdrops.run/catalog
- **OpenAPI 3.1 spec:** https://api.devdrops.run/openapi.json
- **x402 manifest:** https://api.devdrops.run/.well-known/x402
- **MCP server card:** https://api.devdrops.run/.well-known/mcp/server-card.json

## What's inside

37 pay-per-query products spanning compliance and trust infrastructure, UK and US public data, financial and market data, AI-enhanced intelligence, research utilities, and network/macro data. Prices range from $0.001 to $0.10 per request. See `/catalog` for the machine-readable list, or `wiki/STATE.md` for the human-readable version.

## Two payment rails

**x402 USDC on Base mainnet (primary — for AI agents).**
Every priced endpoint returns `HTTP 402 Payment Required` with full x402 v2 metadata. Agents sign an EIP-3009 transfer with a Base USDC wallet, the Coinbase CDP facilitator settles, and the original request is served. No accounts, no keys.

**Stripe credit bundles (secondary — for humans who want card billing).**
Purchase $5 / $25 / $100 bundles at `/buy`. Credits are consumed per request. Webhook-processed, email-notified, receipts via Stripe.

## Quick start (agents)

```javascript
import { fetchWithPayment } from '@x402/fetch';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const wallet = createWalletClient({ account, chain: base, transport: http() });

const res = await fetchWithPayment(
  'https://api.devdrops.run/api/fx/latest?base=GBP',
  { wallet }
);
const data = await res.json();
```

Install deps:

```bash
npm install @x402/fetch viem
```

The wallet needs a small USDC balance on Base ($0.10 is plenty). See https://devdrops.run for more worked examples.

## Architecture

- Cloudflare Workers (Hono framework)
- D1 (SQLite at edge) for caching and analytics
- KV for hot data
- x402 payment middleware via `@x402/hono` + `@x402/extensions/bazaar`
- Coinbase CDP facilitator for Base mainnet payment verification
- Stripe for card-paid credit bundles

## Deploy

```bash
npm install
npx wrangler deploy
```

Configuration is in `wrangler.toml`. Per-route prices are in `src/middleware/payment.ts`. Secrets are managed via `wrangler secret put` — see the list at the bottom of `wrangler.toml`.

## Project documentation

- `wiki/PROJECT.md` — architecture and roadmap
- `wiki/STATE.md` — live state as of the last update
- OpenAPI JSON: `https://api.devdrops.run/openapi.json`

## Issues

Bug reports and feature requests: https://github.com/metamorphosis-sre/devdrops/issues

## License

MIT. See `LICENSE`.

## Built by

[Imago 77 Ltd](https://imago77.com) — pay-per-query data infrastructure for the agent economy.
