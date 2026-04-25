---
name: devdrops-regulatory-feeds
description: Search SEC EDGAR filings and UK Companies House regulatory events by keyword, entity, or form type.
---

## When to use this skill

- User wants to search SEC or UK regulatory filings for a company or topic
- Agent is monitoring for regulatory events: 8-K material disclosures, annual reports, Companies House charges
- User asks "find recent 10-K filings from [company]", "any SEC disclosures about [topic]?", or "has [company] filed any new charges?"
- Agent is building a compliance or investment-research workflow

## How it works

Two endpoints cover the two major regulatory jurisdictions. `/api/regulatory/search` queries a unified index of SEC EDGAR and UK Companies House regulatory notices. `/api/filings/search` searches the full text and metadata of SEC filings (10-K, 10-Q, 8-K, and others) and Companies House document filings. Both are keyword-searchable. Results include direct links to source documents. These endpoints cost $0.01 per query.

## Endpoints

| Method | Path | Price | Required params | Optional params |
|--------|------|-------|-----------------|-----------------|
| GET | `/api/regulatory/search` | $0.01 | `q` | `source` |
| GET | `/api/filings/search` | $0.01 | `q` | `forms`, `entity` |
| GET | `/api/filings/company/:ticker` | $0.01 | `:ticker` (path) | — |

### Parameters

**`/api/regulatory/search`**

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search keyword(s) |
| `source` | string | `all`, `sec`, or `uk` (default `all`) |

**`/api/filings/search`**

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search keyword(s) |
| `forms` | string | Comma-separated form types: `10-K,10-Q,8-K,S-1` etc. |
| `entity` | string | Company name or ticker to scope results |

### Response fields

| Field | Type | Description |
|-------|------|-------------|
| `results` | array | Matching filings/notices |
| `results[].title` | string | Filing or notice title |
| `results[].entity` | string | Company name |
| `results[].source` | string | `sec` or `uk` |
| `results[].form` | string | Form type (SEC) or document type (UK) |
| `results[].date` | string | Filing date ISO 8601 |
| `results[].url` | string | Link to source document |
| `results[].snippet` | string | Text excerpt if available |

## Quick start

### TypeScript

```typescript
import { wrapFetchWithPayment } from "@x402/fetch";
import { CoinbaseWalletClient } from "@coinbase/wallet-sdk";

const client = new CoinbaseWalletClient({ ... });
const pay = wrapFetchWithPayment(fetch, client);

// Search SEC for AI-related disclosures
const res = await pay(
  "https://api.devdrops.run/api/regulatory/search?q=artificial+intelligence+risk&source=sec"
);
const { data } = await res.json();
```

### curl

```bash
# Regulatory notices
curl -H "x-402-payment: <proof>" \
  "https://api.devdrops.run/api/regulatory/search?q=climate+risk&source=sec"

# Specific filing types
curl -H "x-402-payment: <proof>" \
  "https://api.devdrops.run/api/filings/search?q=data+breach&forms=8-K"
```

## Examples

### Example 1: Search SEC for a topic

```
GET /api/regulatory/search?q=cryptocurrency+exposure&source=sec
```

```json
{
  "data": {
    "query": "cryptocurrency exposure",
    "source": "sec",
    "results": [
      {
        "title": "Annual Report (Form 10-K) — Risk Factors",
        "entity": "MicroStrategy Incorporated",
        "source": "sec",
        "form": "10-K",
        "date": "2026-02-28",
        "url": "https://www.sec.gov/Archives/edgar/data/1050446/000105044626000012/0001050446-26-000012-index.htm",
        "snippet": "We hold Bitcoin as a primary treasury reserve asset..."
      }
    ]
  }
}
```

### Example 2: Monitor for material disclosures (8-K)

```
GET /api/filings/search?q=merger+acquisition&forms=8-K&entity=Adobe
```

Returns 8-K material event disclosures filed by Adobe.

### Example 3: Get all recent filings for a ticker

```
GET /api/filings/company/TSLA
```

Returns 10 most recent filings across all form types for Tesla.

### Example 4: Regulatory monitoring agent

```typescript
async function monitorRegulatory(company: string, keywords: string[]) {
  const results = await Promise.all(
    keywords.map(kw =>
      pay(`https://api.devdrops.run/api/regulatory/search?q=${encodeURIComponent(kw + " " + company)}`)
        .then(r => r.json())
    )
  );

  return results
    .flatMap(r => r.data.results)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);
}
```

### Example 5: Combined UK + US regulatory sweep

```typescript
const [uk, us] = await Promise.all([
  pay("https://api.devdrops.run/api/regulatory/search?q=Barclays+enforcement&source=uk"),
  pay("https://api.devdrops.run/api/regulatory/search?q=Barclays+SEC&source=sec"),
]);
```

## Errors & limits

| Status | Meaning |
|--------|---------|
| 402 | Payment required |
| 400 | Missing `q` parameter |
| 503 | EDGAR or Companies House unavailable |

**No free tier.** All requests $0.01.

**Caching:** Results cached 30 minutes. SEC EDGAR indexes update multiple times daily; UK Companies House is refreshed as events are filed.

**Coverage:** SEC covers all US-listed public companies. UK endpoint covers Companies House charges and confirmations; FCA and PRA enforcement notices are periodically indexed but may lag by 24–48 hours.

## Related skills

- [devdrops-company-enrichment](../devdrops-company-enrichment/SKILL.md) — company profile for the entities in results
- [devdrops-research-brief](../devdrops-research-brief/SKILL.md) — synthesise regulatory findings into a structured brief
