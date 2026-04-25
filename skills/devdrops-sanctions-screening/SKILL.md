---
name: devdrops-sanctions-screening
description: Screen names and entities against OFAC SDN, UN Security Council, and UK HMT sanctions lists via a single API call with fuzzy matching.
---

## When to use this skill

- User wants to check whether an individual, company, or vessel appears on a government sanctions list
- Agent is performing KYC/AML due diligence before processing a payment, onboarding a counterparty, or executing a trade
- Agent needs to screen a batch of names in an automated compliance workflow
- User asks "is [name] sanctioned?", "check [entity] against OFAC", or "run a sanctions check on [name]"

## How it works

The endpoint queries three maintained government lists — OFAC SDN (US), UN Security Council consolidated list, and UK HMT financial sanctions — and returns ranked matches using configurable fuzzy string matching. Lists are refreshed via a nightly cron. Each match includes the list source, match score, entity type, programme, and any listed aliases. The `threshold` parameter controls how strict the name match must be (0.0 = any match, 1.0 = exact only; default 0.7). The API does not make a compliance determination; it returns raw match data for the calling system to act on.

This endpoint costs $0.05 per query and is never in the free tier.

## Endpoints

| Method | Path | Price | Required params | Optional params |
|--------|------|-------|-----------------|-----------------|
| GET | `/api/sanctions/check` | $0.05 | `name` | `threshold`, `lists` |

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `name` | string | Name to screen (individual, company, vessel, or alias) |
| `threshold` | number | Match sensitivity 0.0–1.0 (default 0.7) |
| `lists` | string | Comma-separated list filter: `ofac`, `un`, `hmt` (default: all three) |

### Response fields

| Field | Type | Description |
|-------|------|-------------|
| `matched` | boolean | True if any result meets or exceeds threshold |
| `results` | array | Ranked match objects |
| `results[].name` | string | Listed name |
| `results[].score` | number | Fuzzy match score (0–1) |
| `results[].list` | string | `ofac`, `un`, or `hmt` |
| `results[].type` | string | `individual`, `entity`, `vessel`, or `aircraft` |
| `results[].programme` | string | Sanctions programme (e.g. `UKRAINE-EO13662`) |
| `results[].aliases` | array | Additional listed names for this entry |
| `results[].ref` | string | Official list reference number |

## Quick start

### TypeScript (with x402 payment client)

```typescript
import { wrapFetchWithPayment } from "@x402/fetch";
import { CoinbaseWalletClient } from "@coinbase/wallet-sdk";

const client = new CoinbaseWalletClient({ ... });
const pay = wrapFetchWithPayment(fetch, client);

const res = await pay(
  "https://api.devdrops.run/api/sanctions/check?name=Viktor+Bout&threshold=0.8"
);
const data = await res.json();
// data.matched: true/false
// data.results: ranked match array
```

### curl (raw x402 flow)

```bash
# Step 1: probe — server returns 402 with payment details
curl -i "https://api.devdrops.run/api/sanctions/check?name=Viktor+Bout"

# Step 2: pay (use x402 CLI or wallet SDK)
# Step 3: retry with payment proof header
curl -H "x-402-payment: <payment-proof>" \
  "https://api.devdrops.run/api/sanctions/check?name=Viktor+Bout&threshold=0.8"
```

## Examples

### Example 1: Basic name check

```
GET /api/sanctions/check?name=Evgeny+Prigozhin
```

```json
{
  "product": "sanctions",
  "cached": false,
  "data": {
    "query": "Evgeny Prigozhin",
    "threshold": 0.7,
    "matched": true,
    "results": [
      {
        "name": "PRIGOZHIN, Yevgeniy Viktorovich",
        "score": 0.91,
        "list": "ofac",
        "type": "individual",
        "programme": "RUSSIA-EO14024",
        "aliases": ["PRIGOZHIN, Evgeny", "Евгений Викторович Пригожин"],
        "ref": "OFAC-37684",
        "dob": "1961-06-01",
        "nationality": "Russian Federation"
      }
    ]
  },
  "timestamp": "2026-04-25T14:00:00.000Z"
}
```

### Example 2: Company check with stricter threshold

```
GET /api/sanctions/check?name=Rostec+Corporation&threshold=0.9&lists=ofac,hmt
```

Returns matches against OFAC and UK HMT lists only, requiring ≥0.9 similarity score.

### Example 3: No match result

```
GET /api/sanctions/check?name=Acme+Trading+Ltd
```

```json
{
  "data": {
    "query": "Acme Trading Ltd",
    "threshold": 0.7,
    "matched": false,
    "results": []
  }
}
```

### Example 4: Agent compliance workflow (TypeScript)

```typescript
async function approvePayment(counterpartyName: string): Promise<boolean> {
  const res = await pay(
    `https://api.devdrops.run/api/sanctions/check?name=${encodeURIComponent(counterpartyName)}&threshold=0.75`
  );
  const { data } = await res.json();

  if (data.matched) {
    // Log and block — do not process payment
    console.warn(`Sanctions hit for ${counterpartyName}:`, data.results[0]);
    return false;
  }
  return true;
}
```

### Example 5: Batch screening loop

```typescript
const names = ["Vladimir Potanin", "Mikhail Fridman", "Pyotr Aven"];

const results = await Promise.all(
  names.map(name =>
    pay(`https://api.devdrops.run/api/sanctions/check?name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(d => ({ name, matched: d.data.matched, topScore: d.data.results[0]?.score ?? 0 }))
  )
);
```

## Errors & limits

| Status | Meaning |
|--------|---------|
| 402 | Payment required — no valid x402 payment header |
| 400 | Missing `name` parameter |
| 503 | Sanctions list unavailable (lists refresh nightly; rare) |

**No free tier.** All requests are paid at $0.05 each.

**Caching:** Results are cached for 30 minutes per query+threshold combination. Live data is refreshed nightly from official list sources. For real-time compliance requirements, note the cache TTL.

**Name encoding:** URL-encode the `name` parameter. Diacritics and non-Latin characters are supported (UTF-8). Transliteration variants are matched via the aliases field on list entries.

**Threshold guidance:** 0.7 (default) catches common transliteration variants. Lower values increase recall at the cost of false positives. 0.9+ is suitable only for exact-match confirmation.

## Related skills

- [devdrops-company-enrichment](../devdrops-company-enrichment/SKILL.md) — verify company identity before screening
- [devdrops-regulatory-feeds](../devdrops-regulatory-feeds/SKILL.md) — regulatory status alongside sanctions check
