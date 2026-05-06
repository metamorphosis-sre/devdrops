# Paid x402 Smoke Readiness

This runbook is for the first explicitly approved paid DevDrops transaction.

## Required Secret

Use a dedicated low-balance smoke wallet secret. Recommended name:

```text
X402_SMOKE_PRIVATE_KEY
```

Do not reuse production treasury wallets. Do not print the value. Do not write it to logs, artifacts, summaries, or frontend code.

## Network And Funding

- Chain/network: Base mainnet (`eip155:8453`)
- Currency: USDC
- Minimum practical balance: enough USDC for one low-cost endpoint plus gas/settlement buffer
- Recommended first endpoint: a low-cost non-AI endpoint from `/catalog`, such as `/api/fx/latest` after free-tier quota is exhausted or another `$0.001`/`$0.005` endpoint

## Safe Transaction Path

1. Confirm `/catalog` and `/.well-known/x402` are healthy.
2. Probe the chosen paid endpoint without payment and confirm HTTP `402`.
3. Build the x402 payment proof locally in the workflow or operator machine without echoing wallet material.
4. Retry the same endpoint with the payment header.
5. Confirm HTTP `200` and structured JSON.
6. Verify a D1 `transactions` row exists.
7. Check x402scan indexing after settlement.

## Guardrails

- Never run this on pull requests.
- Never run automatically on schedule.
- Never include the private key in command output.
- Never use an AI endpoint for the first payment smoke.
- Do not add a production payment bypass.
