---
name: devdrops-property-intelligence
description: Query UK property prices, House Price Index data, and transaction history by postcode using Land Registry data.
---

## When to use this skill

- User wants current or historical property prices for a UK postcode or area
- Agent is building a property valuation tool, market analysis report, or mortgage affordability calculator
- User asks "what's the average house price in [postcode]?", "show me recent sales in [area]", or "what's the HPI for [region]?"
- Agent needs structured property market data for a downstream analysis or decision

## How it works

The endpoint queries UK Land Registry Price Paid data and the House Price Index (HPI). Inputs are UK postcodes (full or partial) or region names. The API returns average prices by property type, transaction volumes, annual change percentages, and recent individual sales. Data is sourced from the Land Registry open data programme; transactions typically appear within 4–6 weeks of completion. This endpoint costs $0.01 per query.

## Endpoints

| Method | Path | Price | Required params | Optional params |
|--------|------|-------|-----------------|-----------------|
| GET | `/api/property/uk/prices` | $0.01 | `postcode` | `type`, `from`, `to` |
| GET | `/api/property/mcp` | free (GET) | — | — |

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `postcode` | string | UK postcode, full (SW1A 1AA) or partial (SW1A) |
| `type` | string | Filter: `detached`, `semi-detached`, `terraced`, `flat`, `all` (default `all`) |
| `from` | string | Start date ISO 8601 (e.g. `2023-01-01`) |
| `to` | string | End date ISO 8601 |

### Response fields

| Field | Type | Description |
|-------|------|-------------|
| `postcode` | string | Normalised postcode queried |
| `area` | string | Administrative area name |
| `average_price` | number | Average sale price (£) for period |
| `price_by_type` | object | Averages keyed by property type |
| `annual_change_pct` | number | Year-on-year % change |
| `transaction_count` | number | Number of transactions in period |
| `recent_sales` | array | Up to 10 most recent transactions |
| `recent_sales[].address` | string | Full address |
| `recent_sales[].price` | number | Sale price (£) |
| `recent_sales[].date` | string | Completion date ISO 8601 |
| `recent_sales[].type` | string | Property type |

## Quick start

### TypeScript

```typescript
import { wrapFetchWithPayment } from "@x402/fetch";
import { CoinbaseWalletClient } from "@coinbase/wallet-sdk";

const client = new CoinbaseWalletClient({ ... });
const pay = wrapFetchWithPayment(fetch, client);

const res = await pay(
  "https://api.devdrops.run/api/property/uk/prices?postcode=EC1A+1BB"
);
const { data } = await res.json();
console.log(data.average_price, data.annual_change_pct);
```

### curl

```bash
curl -H "x-402-payment: <payment-proof>" \
  "https://api.devdrops.run/api/property/uk/prices?postcode=EC1A+1BB"
```

## Examples

### Example 1: Query by full postcode

```
GET /api/property/uk/prices?postcode=E14+5AB
```

```json
{
  "product": "property",
  "cached": false,
  "data": {
    "postcode": "E14 5AB",
    "area": "Tower Hamlets",
    "average_price": 524000,
    "price_by_type": {
      "flat": 468000,
      "terraced": 612000,
      "semi-detached": 710000,
      "detached": null
    },
    "annual_change_pct": -3.2,
    "transaction_count": 47,
    "recent_sales": [
      {
        "address": "14 Canary Wharf Apartments, E14 5AB",
        "price": 495000,
        "date": "2026-02-14",
        "type": "flat"
      }
    ]
  }
}
```

### Example 2: Filter by property type with date range

```
GET /api/property/uk/prices?postcode=SW3&type=flat&from=2025-01-01&to=2025-12-31
```

Returns flat transactions in the SW3 partial postcode area for 2025.

### Example 3: Agent property search workflow

```typescript
async function getPropertyMarket(postcode: string) {
  const res = await pay(
    `https://api.devdrops.run/api/property/uk/prices?postcode=${encodeURIComponent(postcode)}`
  );
  const { data } = await res.json();

  return {
    summary: `${data.area}: avg £${data.average_price.toLocaleString()}, ${data.annual_change_pct > 0 ? "+" : ""}${data.annual_change_pct}% YoY`,
    recentSales: data.recent_sales.slice(0, 3),
  };
}
```

### Example 4: Compare two postcodes

```typescript
const [london, manchester] = await Promise.all([
  pay("https://api.devdrops.run/api/property/uk/prices?postcode=EC1A").then(r => r.json()),
  pay("https://api.devdrops.run/api/property/uk/prices?postcode=M1").then(r => r.json()),
]);

console.log({
  londonAvg: london.data.average_price,
  manchesterAvg: manchester.data.average_price,
  gap: london.data.average_price - manchester.data.average_price,
});
```

## Errors & limits

| Status | Meaning |
|--------|---------|
| 402 | Payment required |
| 400 | Missing or invalid `postcode` parameter |
| 404 | No data found for the given postcode / no transactions in date range |
| 503 | Land Registry data unavailable |

**No free tier.** All requests are paid at $0.01 each.

**Caching:** Results cached for 30 minutes. Land Registry data is updated weekly; recent transactions (< 6 weeks) may not yet appear.

**Postcode formats:** Accepts full (SW1A 1AA), partial (SW1A, EC1), or district-only (SW1) postcodes. Full postcodes return the most specific data; partial postcodes aggregate across the sector.

**Coverage:** England and Wales only. Scotland and Northern Ireland have separate land registries and are not covered.

## Related skills

- [devdrops-company-enrichment](../devdrops-company-enrichment/SKILL.md) — for property companies and freeholders
- [devdrops-sanctions-screening](../devdrops-sanctions-screening/SKILL.md) — for counterparty checks in property transactions
