# DevDrops Distribution Checklist

Date: 2026-05-06

## Discovery Surfaces

- `/catalog` — live, 43 products
- `/catalog.json` — live machine-readable catalog alias
- `/openapi.json` — live OpenAPI 3.1
- `/.well-known/x402` — live x402 discovery manifest
- `/.well-known/mcp.json` — live MCP discovery manifest
- `/.well-known/mcp/server-card.json` — live Smithery-compatible server card
- `/llms.txt` — redirects to `/.well-known/llms.txt`

## External Distribution

| Channel | Status | Next action |
|---|---|---|
| Coinbase x402 Bazaar | Earlier docs reference `coinbase/x402#38` | Check PR status manually before refreshing listing |
| awesome-x402 | Earlier docs reference `xpaysh/awesome-x402#209` | Check PR status manually before refreshing listing |
| x402scan | Pending first paid transaction visibility | Run one explicitly approved paid transaction when ready |
| MCP registry / Smithery | Manifest and server card now exist | Submit using `/.well-known/mcp.json` and `/.well-known/mcp/server-card.json` |
| RapidAPI | Distribution copy exists | Keep as marketing surface only; do not make RapidAPI the product dependency |

## First Paid Transaction Path

Do not run this automatically. When explicitly approved:

1. Pick a low-cost endpoint from `/catalog`.
2. Use a funded Base wallet with the x402 client.
3. Confirm the endpoint first returns HTTP 402.
4. Submit payment proof.
5. Confirm HTTP 200 response.
6. Confirm transaction appears in D1 `transactions`.
7. Check x402scan indexing after settlement.

## Safety

- Do not expose wallet private keys.
- Do not commit payment secrets.
- Do not add free production bypasses for paid endpoints.
- Do not run paid transactions as CI.
- Keep metadata/discovery endpoints free.
