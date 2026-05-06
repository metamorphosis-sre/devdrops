# DevDrops Cost Governance

## AI And Paid Upstream Posture

DevDrops includes paid or usage-sensitive surfaces:

- Claude-backed routes: sentiment, signals, documents, research, summarize/classify/entities where configured
- Workers AI routes: image generation and inference
- Odds API: paid upstream
- Stripe/credits: payment-dependent
- x402 facilitator: payment verification path

No real AI or paid x402 transaction should run in CI.

## Safe Validation

Use metadata smoke:

```bash
npm run smoke:metadata
```

This checks only free discovery/health surfaces.

## Cost Controls To Preserve

- Product prices must remain visible in `/catalog`, `/openapi.json`, and `/.well-known/x402`.
- AI routes should return clear missing-key or upstream errors rather than silently retrying expensive calls.
- Free-tier endpoints should remain bounded.
- Cron should not perform AI work.
- Paid upstream dependencies should be documented before adding new modules.

## Recommended Next Improvement

Add a read-only cost dashboard backed by D1 transaction rows:

- daily revenue
- x402 paid calls
- abandoned 402s
- AI route count
- upstream error count
- estimated AI/provider cost by product
