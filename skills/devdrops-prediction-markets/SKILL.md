---
name: devdrops-prediction-markets
description: Query live prediction market probabilities from Polymarket and Manifold Markets — cross-platform, normalised, searchable.
---

## When to use this skill

- User wants to know the current market probability for a real-world event
- Agent is building a decision-support tool, news tracker, or probability aggregator
- User asks "what does the market say about [event]?", "probability of [outcome]?", or "find markets about [topic]"
- Agent needs calibrated crowd forecasts to augment its own analysis

## How it works

The endpoint aggregates live markets from Polymarket (on-chain prediction markets) and Manifold Markets (play-money forecasting platform). Markets are normalised to a common schema: each has a title, probability (0–1), platform, close date, and volume. The `/markets` endpoint lists active markets sorted by volume; `/search` filters by keyword. This endpoint costs $0.005 per query.

## Endpoints

| Method | Path | Price | Required params | Optional params |
|--------|------|-------|-----------------|-----------------|
| GET | `/api/predictions/markets` | $0.005 | — | `limit` |
| GET | `/api/predictions/search` | $0.005 | `q` | `limit`, `platform` |
| GET | `/api/predictions/market/:id` | $0.005 | `:id` (path) | — |

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `limit` | number | Max markets to return (1–50, default 20) |
| `q` | string | Keyword search query |
| `platform` | string | Filter: `polymarket`, `manifold`, or `all` (default `all`) |

### Response fields

| Field | Type | Description |
|-------|------|-------------|
| `markets` | array | List of markets |
| `markets[].id` | string | Platform-specific market ID |
| `markets[].platform` | string | `polymarket` or `manifold` |
| `markets[].title` | string | Market question |
| `markets[].probability` | number | Current probability 0–1 |
| `markets[].volume` | number | Trading volume (USD for Polymarket) |
| `markets[].close_date` | string | Market resolution date ISO 8601 |
| `markets[].url` | string | Link to market on platform |

## Quick start

### TypeScript

```typescript
import { wrapFetchWithPayment } from "@x402/fetch";
const pay = wrapFetchWithPayment(fetch, walletClient);

// Top markets by volume
const res = await pay("https://api.devdrops.run/api/predictions/markets?limit=10");
const { data } = await res.json();

// Search for election markets
const searchRes = await pay(
  "https://api.devdrops.run/api/predictions/search?q=election+2026"
);
```

### curl

```bash
curl -H "x-402-payment: <proof>" \
  "https://api.devdrops.run/api/predictions/markets?limit=5"
```

## Examples

### Example 1: Top markets

```
GET /api/predictions/markets?limit=3
```

```json
{
  "product": "predictions",
  "data": {
    "markets": [
      {
        "id": "poly-0x1a2b",
        "platform": "polymarket",
        "title": "Will the Fed cut rates at the June 2026 meeting?",
        "probability": 0.34,
        "volume": 2840000,
        "close_date": "2026-06-12",
        "url": "https://polymarket.com/event/fed-june-2026"
      },
      {
        "id": "mf-abc123",
        "platform": "manifold",
        "title": "Will OpenAI release GPT-5 before July 2026?",
        "probability": 0.61,
        "volume": 45000,
        "close_date": "2026-07-01",
        "url": "https://manifold.markets/question/openai-gpt5-2026"
      }
    ]
  }
}
```

### Example 2: Search for a specific topic

```
GET /api/predictions/search?q=bitcoin+price+2026&platform=polymarket
```

Returns Polymarket markets matching "bitcoin price 2026".

### Example 3: Get a specific market

```
GET /api/predictions/market/poly-0x1a2b
```

Returns full details for a single market including order book if available.

### Example 4: Decision support agent

```typescript
async function getConsensus(topic: string): Promise<string> {
  const res = await pay(
    `https://api.devdrops.run/api/predictions/search?q=${encodeURIComponent(topic)}&limit=5`
  );
  const { data } = await res.json();

  if (!data.markets.length) return `No prediction markets found for: ${topic}`;

  const avg = data.markets.reduce((s: number, m: any) => s + m.probability, 0) / data.markets.length;
  const topMarket = data.markets.sort((a: any, b: any) => b.volume - a.volume)[0];

  return `Market consensus on "${topic}": ${(avg * 100).toFixed(0)}% average probability. ` +
    `Highest-volume market: "${topMarket.title}" at ${(topMarket.probability * 100).toFixed(0)}%.`;
}
```

### Example 5: Cross-platform probability comparison

```typescript
const [poly, manifold] = await Promise.all([
  pay(`https://api.devdrops.run/api/predictions/search?q=AI+regulation&platform=polymarket`),
  pay(`https://api.devdrops.run/api/predictions/search?q=AI+regulation&platform=manifold`),
]);

const polyProbs = (await poly.json()).data.markets.map((m: any) => m.probability);
const manifoldProbs = (await manifold.json()).data.markets.map((m: any) => m.probability);
```

## Errors & limits

| Status | Meaning |
|--------|---------|
| 402 | Payment required |
| 400 | Missing `q` for search endpoint |
| 503 | Upstream platforms unavailable |

**No free tier.** All requests $0.005.

**Caching:** Market data cached 5 minutes (shorter than other products due to live pricing).

**Probability scale:** All probabilities normalised to 0–1 regardless of platform. Manifold uses a Bayesian scoring rule; Polymarket uses LMSR or orderbook pricing. Direct comparison is approximate.

**Resolved markets:** Resolved markets may still appear briefly with probability 0 or 1. Filter on `close_date > today` to see only active markets.

## Related skills

- [devdrops-fx-rates](../devdrops-fx-rates/SKILL.md) — pair with prediction markets for macro context
- [devdrops-research-brief](../devdrops-research-brief/SKILL.md) — synthesise market data into a structured brief
