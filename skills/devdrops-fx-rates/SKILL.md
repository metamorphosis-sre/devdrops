---
name: devdrops-fx-rates
description: Get live and historical currency exchange rates for 33+ currencies via the European Central Bank (ECB) data feed. Includes conversion endpoint.
---

## When to use this skill

- User wants the current exchange rate between two currencies
- Agent is converting a monetary amount for display, calculation, or payment
- User asks "what's the USD/GBP rate?", "convert 500 EUR to JPY", or "what was the EUR/USD rate last Tuesday?"
- Agent needs to normalise multi-currency data to a common base for comparison

## How it works

The endpoint proxies the ECB's daily reference rates via Frankfurter — an open-source, free, no-key API backed by official ECB data. Rates are updated daily at ~16:00 CET on business days. The `latest` endpoint returns today's rates; `convert` applies the rate to an amount; `historical` queries rates for a specific past date. This endpoint costs $0.001 per query and is in the **free tier** (5 queries/day/IP before payment).

## Endpoints

| Method | Path | Price | Required params | Optional params |
|--------|------|-------|-----------------|-----------------|
| GET | `/api/fx/latest` | $0.001 | — | `base`, `symbols` |
| GET | `/api/fx/convert` | $0.001 | `from`, `to` | `amount` |
| GET | `/api/fx/historical` | $0.001 | `date` | `base`, `symbols` |

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `base` | string | Base currency code (default `EUR`) |
| `symbols` | string | Comma-separated target currencies (default: all 33) |
| `from` | string | Source currency code (ISO 4217) |
| `to` | string | Target currency code (ISO 4217) |
| `amount` | number | Amount to convert (default 1) |
| `date` | string | ISO 8601 date for historical rate |

### Supported currencies

EUR, USD, GBP, JPY, CHF, AUD, CAD, CNY, HKD, NZD, SEK, NOK, DKK, SGD, INR, MXN, BRL, ZAR, RUB, TRY, PLN, CZK, HUF, RON, BGN, HRK, ISK, THB, MYR, PHP, IDR, ILS, KRW

## Quick start

### TypeScript (free tier)

```typescript
// Free tier: no x402 payment needed for first 5 queries/day/IP
const res = await fetch("https://api.devdrops.run/api/fx/latest?base=USD&symbols=GBP,EUR,JPY");
const { data } = await res.json();
// data.rates: { GBP: 0.787, EUR: 0.921, JPY: 149.3 }
```

### TypeScript (paid, beyond free tier)

```typescript
import { wrapFetchWithPayment } from "@x402/fetch";
import { CoinbaseWalletClient } from "@coinbase/wallet-sdk";

const pay = wrapFetchWithPayment(fetch, new CoinbaseWalletClient({ ... }));
const res = await pay("https://api.devdrops.run/api/fx/convert?from=USD&to=GBP&amount=1000");
const { data } = await res.json();
// data.amount: 787.42
```

### curl

```bash
# Latest rates (may use free tier)
curl "https://api.devdrops.run/api/fx/latest"

# Convert
curl -H "x-402-payment: <proof>" \
  "https://api.devdrops.run/api/fx/convert?from=EUR&to=USD&amount=250"
```

## Examples

### Example 1: All rates against EUR

```
GET /api/fx/latest
```

```json
{
  "product": "fx",
  "cached": true,
  "data": {
    "base": "EUR",
    "date": "2026-04-25",
    "rates": {
      "USD": 1.087,
      "GBP": 0.855,
      "JPY": 163.4,
      "CHF": 0.967
    }
  }
}
```

### Example 2: Convert USD to multiple currencies

```
GET /api/fx/latest?base=USD&symbols=GBP,EUR,CAD,AUD
```

### Example 3: Specific conversion

```
GET /api/fx/convert?from=GBP&to=EUR&amount=500
```

```json
{
  "data": {
    "from": "GBP",
    "to": "EUR",
    "amount": 500,
    "result": 585.38,
    "rate": 1.17076,
    "date": "2026-04-25"
  }
}
```

### Example 4: Historical rate

```
GET /api/fx/historical?date=2025-01-15&base=USD&symbols=GBP
```

### Example 5: Currency normalisation agent

```typescript
// Normalise a list of invoices to USD
async function normaliseToUSD(invoices: { amount: number; currency: string }[]) {
  const res = await fetch("https://api.devdrops.run/api/fx/latest?base=USD");
  const { data } = await res.json();

  return invoices.map(inv => ({
    ...inv,
    usd: inv.currency === "USD" ? inv.amount : inv.amount / data.rates[inv.currency],
  }));
}
```

## Errors & limits

| Status | Meaning |
|--------|---------|
| 402 | Payment required (free tier exhausted) |
| 400 | Invalid currency code or missing required param |
| 404 | No rate found for historical date (weekends/holidays have no ECB update) |

**Free tier:** 5 queries/day/IP on FX endpoints. Check `X-Free-Tier-Remaining` response header.

**Caching:** Latest rates cached until next ECB update (rates change once per business day). Historical rates are permanently cached.

**Weekends and holidays:** The ECB does not publish rates on weekends or ECB bank holidays. Historical queries for these dates will 404. Use the most recent prior business day.

**Precision:** Rates are provided to 5 significant figures, as published by the ECB.

## Related skills

- [devdrops-weather](../devdrops-weather/SKILL.md) — another free-tier utility endpoint
- [devdrops-prediction-markets](../devdrops-prediction-markets/SKILL.md) — market probability data to pair with rates
