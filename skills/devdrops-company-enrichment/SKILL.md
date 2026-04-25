---
name: devdrops-company-enrichment
description: Look up UK companies by name, number, or domain — returns officers, PSCs, charges, filing history, and status from Companies House.
---

## When to use this skill

- User wants to verify a company's legal status, registration number, or registered address
- Agent is conducting due diligence on a counterparty, supplier, or investment target
- User asks "who are the directors of [company]?", "is [company] still active?", "who owns [company]?", or "find the company registered at [domain]"
- Agent needs beneficial ownership data for KYB compliance

## How it works

The endpoint queries UK Companies House via their REST API. You can search by company name, look up by Companies House number, or resolve a domain to a company. Each response includes the company profile, current officers (directors, secretaries), persons with significant control (PSCs), registered charges (mortgages/debentures), and recent filing history. This endpoint costs $0.02 per query.

## Endpoints

| Method | Path | Price | Required params | Optional params |
|--------|------|-------|-----------------|-----------------|
| GET | `/api/company/search` | $0.02 | `q` | `type`, `limit` |
| GET | `/api/company/lookup/:number` | $0.02 | `:number` (path) | — |
| GET | `/api/company/domain/:domain` | $0.02 | `:domain` (path) | — |

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Company name search query |
| `type` | string | Filter: `ltd`, `plc`, `llp`, `partnership` (default: all) |
| `limit` | number | Max results for search (1–20, default 5) |

### Response fields (lookup/domain)

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Registered company name |
| `number` | string | Companies House number (8 digits) |
| `status` | string | `active`, `dissolved`, `liquidation`, etc. |
| `type` | string | Company type |
| `incorporated` | string | Incorporation date ISO 8601 |
| `registered_address` | object | Full registered address |
| `sic_codes` | array | SIC codes (business activities) |
| `officers` | array | Current officers with role and appointment date |
| `pscs` | array | Persons with significant control |
| `charges` | object | `total`, `outstanding`, `satisfied` counts |
| `filings` | array | 5 most recent filings with type and date |

## Quick start

### TypeScript

```typescript
import { wrapFetchWithPayment } from "@x402/fetch";
import { CoinbaseWalletClient } from "@coinbase/wallet-sdk";

const client = new CoinbaseWalletClient({ ... });
const pay = wrapFetchWithPayment(fetch, client);

// Search by name
const res = await pay(
  "https://api.devdrops.run/api/company/search?q=Revolut+Ltd&limit=3"
);
const { data } = await res.json();

// Look up by number
const res2 = await pay(
  "https://api.devdrops.run/api/company/lookup/08804411"
);
```

### curl

```bash
# Search
curl -H "x-402-payment: <proof>" \
  "https://api.devdrops.run/api/company/search?q=Monzo+Bank"

# Lookup by number
curl -H "x-402-payment: <proof>" \
  "https://api.devdrops.run/api/company/lookup/09446231"
```

## Examples

### Example 1: Company search

```
GET /api/company/search?q=Wise+Payments&limit=2
```

```json
{
  "data": {
    "results": [
      {
        "name": "WISE PAYMENTS LIMITED",
        "number": "07209813",
        "status": "active",
        "type": "ltd",
        "incorporated": "2010-01-22",
        "registered_address": {
          "address_line_1": "6th Floor, TEA Building, 56 Shoreditch High Street",
          "locality": "London",
          "postal_code": "E1 6JJ"
        }
      }
    ]
  }
}
```

### Example 2: Full profile lookup

```
GET /api/company/lookup/07209813
```

Returns full profile including officers, PSCs, and charges.

### Example 3: Domain-to-company resolution

```
GET /api/company/domain/wise.com
```

Resolves the domain to the registered company via DNS/WHOIS cross-reference.

### Example 4: Due diligence workflow

```typescript
async function dueDiligence(companyName: string) {
  // Search for company
  const searchRes = await pay(
    `https://api.devdrops.run/api/company/search?q=${encodeURIComponent(companyName)}&limit=1`
  );
  const { data: searchData } = await searchRes.json();
  const top = searchData.results[0];

  if (!top) return { found: false };

  // Get full profile
  const profileRes = await pay(
    `https://api.devdrops.run/api/company/lookup/${top.number}`
  );
  const { data } = await profileRes.json();

  return {
    status: data.status,
    incorporated: data.incorporated,
    directors: data.officers.filter((o: any) => o.role === "director").length,
    pscs: data.pscs.length,
    outstandingCharges: data.charges.outstanding,
  };
}
```

### Example 5: Find all directors

```typescript
const res = await pay("https://api.devdrops.run/api/company/lookup/09446231");
const { data } = await res.json();

const directors = data.officers
  .filter((o: any) => o.role === "director" && !o.resigned_on)
  .map((o: any) => ({ name: o.name, appointed: o.appointed_on }));
```

## Errors & limits

| Status | Meaning |
|--------|---------|
| 402 | Payment required |
| 400 | Missing `q` parameter for search |
| 404 | Company not found |
| 503 | Companies House API unavailable |

**No free tier.** All requests are paid at $0.02 each.

**Caching:** Results cached 30 minutes. Companies House data is live; very recent changes (< 24h) may not yet reflect.

**Coverage:** UK companies only (England, Wales, Scotland, Northern Ireland).

**Dissolved companies:** Profiles for dissolved companies are returned with `status: "dissolved"` but may have incomplete officer/PSC data.

## Related skills

- [devdrops-regulatory-feeds](../devdrops-regulatory-feeds/SKILL.md) — filings and regulatory events for the same company
- [devdrops-sanctions-screening](../devdrops-sanctions-screening/SKILL.md) — screen the company name and its directors
