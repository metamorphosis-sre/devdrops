# DevDrops

Pay-per-query data APIs for AI agents. No accounts, no API keys, no subscriptions.

**Live:** https://devdrops.run  
**API:** https://api.devdrops.run  
**Docs:** https://api.devdrops.run/openapi.json  
**Catalog:** https://api.devdrops.run/catalog

43 production products/endpoints serving prediction markets, sports odds, financial data, regulatory filings, weather, FX rates, crypto prices, QR codes, timezones, utility wrappers, MCP tools, AI sentiment, and more — paid via x402 micropayments on Base mainnet, with a small free tier on selected utility endpoints.

## Quick start

```bash
npm install @x402/fetch viem
```

```javascript
import { fetchWithPayment } from '@x402/fetch';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const account = privateKeyToAccount('0xYOUR_PRIVATE_KEY');
const wallet = createWalletClient({ account, chain: base, transport: http() });

const res = await fetchWithPayment('https://api.devdrops.run/api/fx/latest', { wallet });
const data = await res.json();
```

See https://devdrops.run for more examples.

## Architecture

- Cloudflare Workers (Hono framework)
- D1 (SQLite at edge) for caching and analytics
- KV for hot data
- x402 payment middleware via @x402/hono
- Coinbase CDP facilitator for payment verification

## Documentation

- Project wiki: `wiki/PROJECT.md`
- Current state: `wiki/STATE.md`
- Production audit: `docs/devdrops-production-audit.md`
- Endpoint matrix: `docs/devdrops-endpoint-matrix.md`
- Distribution checklist: `docs/devdrops-distribution-checklist.md`

## Deploy

```bash
npm install
npm run typecheck
npm test
npm run smoke:metadata
npx wrangler deploy
```

Configuration in `wrangler.toml`. Secrets via `wrangler secret put`.

## Issues

https://github.com/metamorphosis-sre/devdrops/issues
