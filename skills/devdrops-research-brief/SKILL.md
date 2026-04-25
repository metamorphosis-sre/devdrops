---
name: devdrops-research-brief
description: Generate a structured multi-source research brief on any topic using Claude AI synthesis. Returns executive summary, key findings, risks, and citations.
---

## When to use this skill

- User wants a structured research brief on a topic, company, market, or event
- Agent is preparing background material for a meeting, report, or decision
- User asks "research [topic] for me", "give me a brief on [subject]", or "what do I need to know about [topic]?"
- Agent needs to synthesise information from multiple sources into a structured output

## How it works

The endpoint gathers data from multiple sources — Google News headlines, academic papers (OpenAlex), and Wikipedia — then sends the aggregated content to the Claude API for synthesis into a structured brief. The brief includes an executive summary, key findings, risks, and source metadata. `GET /api/research/brief?topic=` is the quick-start path and caches results. `POST /api/research/brief` skips the cache and accepts a `focus` and `depth` parameter for more targeted output. This endpoint costs $0.10 per query — the highest price in the data aggregation tier due to Claude API costs.

## Endpoints

| Method | Path | Price | Required params | Optional params |
|--------|------|-------|-----------------|-----------------|
| GET | `/api/research/brief` | $0.10 | `topic` | — |
| POST | `/api/research/brief` | $0.10 | `topic` (body) | `focus`, `depth` |

### Parameters

**GET**

| Param | Type | Description |
|-------|------|-------------|
| `topic` | string | Research topic (a clear noun phrase or question) |

**POST body**

| Field | Type | Description |
|-------|------|-------------|
| `topic` | string | Research topic (required) |
| `focus` | string | Optional emphasis: any free-text focus area (e.g. `"risks"`, `"regulatory"`) |
| `depth` | string | `"quick"`, `"standard"` (default), or `"deep"` |

### Response fields

| Field | Type | Description |
|-------|------|-------------|
| `topic` | string | Topic as submitted |
| `sources_consulted` | object | `news_articles`, `academic_papers`, `wikipedia` counts |
| `brief` | object | AI-synthesised output |
| `brief.summary` | string | Executive summary paragraph |
| `brief.findings` | array | Key findings |
| `brief.risks` | array | Risks or caveats |

## Quick start

### TypeScript — GET (cached)

```typescript
import { wrapFetchWithPayment } from "@x402/fetch";
const pay = wrapFetchWithPayment(fetch, walletClient);

const res = await pay(
  "https://api.devdrops.run/api/research/brief?topic=EU+AI+Act+compliance+requirements"
);
const { data } = await res.json();
console.log(data.brief.summary);
```

### TypeScript — POST (fresh, with focus)

```typescript
const res = await pay("https://api.devdrops.run/api/research/brief", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    topic: "quantum computing investment landscape",
    focus: "opportunities in enterprise software",
    depth: "deep",
  }),
});
const { data } = await res.json();
```

### curl

```bash
# GET
curl -H "x-402-payment: <proof>" \
  "https://api.devdrops.run/api/research/brief?topic=stablecoin+regulation+US+2026"

# POST with focus
curl -X POST -H "x-402-payment: <proof>" \
  -H "Content-Type: application/json" \
  -d '{"topic":"carbon credits market 2026","focus":"risks","depth":"standard"}' \
  "https://api.devdrops.run/api/research/brief"
```

## Examples

### Example 1: GET brief

```
GET /api/research/brief?topic=stablecoin+regulation+US+2026
```

```json
{
  "product": "research",
  "data": {
    "topic": "stablecoin regulation US 2026",
    "sources_consulted": {
      "news_articles": 7,
      "academic_papers": 5,
      "wikipedia": true
    },
    "brief": {
      "summary": "US stablecoin regulation accelerated in 2025–2026 following GENIUS Act passage. Key requirements include 1:1 reserve backing, monthly attestations, and registration with OCC or state regulators for issuers above $10B market cap.",
      "findings": [
        "GENIUS Act passed May 2025 — establishes federal licensing for payment stablecoin issuers",
        "Reserve requirements: US Treasuries (≤93 days), insured deposits, central bank reserves only",
        "Algorithmic stablecoins explicitly excluded from the GENIUS Act framework"
      ],
      "risks": [
        "State vs federal regulatory fragmentation unresolved for cross-border issuers",
        "Non-US issuers face uncertain access to US market without federal registration"
      ]
    }
  }
}
```

### Example 2: POST with focus

```http
POST /api/research/brief
Content-Type: application/json

{
  "topic": "lithium supply chain concentration risk",
  "focus": "risks for EV manufacturers",
  "depth": "deep"
}
```

### Example 3: Pre-meeting brief agent

```typescript
async function preMeetingBrief(company: string, context: string) {
  const res = await pay("https://api.devdrops.run/api/research/brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: `${company} company overview`,
      focus: context,
      depth: "standard",
    }),
  });
  const { data } = await res.json();
  return data.brief;
}

const brief = await preMeetingBrief(
  "Stripe",
  "focus on financial stability and regulatory standing for vendor due diligence"
);
```

### Example 4: Parallel topic briefs

```typescript
const topics = [
  "EU AI Act compliance",
  "SEC crypto enforcement trends",
  "UK fintech regulation 2026",
];

const briefs = await Promise.all(
  topics.map(topic =>
    pay(`https://api.devdrops.run/api/research/brief?topic=${encodeURIComponent(topic)}`)
      .then(r => r.json())
      .then(d => ({ topic, summary: d.data?.brief?.summary }))
  )
);
```

## Errors & limits

| Status | Meaning |
|--------|---------|
| 402 | Payment required |
| 400 | Missing `topic` |
| 503 | Claude API or ANTHROPIC_API_KEY not configured |
| 504 | Timeout — deep briefs can take 10–20 seconds |

**No free tier.** All requests $0.10.

**Caching:** GET requests are cached per topic. POST requests are NOT cached — each call synthesises fresh.

**Latency:** Standard depth: 5–10 seconds. Deep: 10–20 seconds. Set your HTTP client timeout to at least 30 seconds.

**Topic specificity:** More specific topics produce better briefs. `"AI regulation UK 2026"` outperforms `"AI"`.

**Sources:** The endpoint queries Google News (up to 8 headlines), OpenAlex academic papers (up to 5), and Wikipedia. It does not do live web search.

## Related skills

- [devdrops-regulatory-feeds](../devdrops-regulatory-feeds/SKILL.md) — raw regulatory data to supplement or verify
- [devdrops-prediction-markets](../devdrops-prediction-markets/SKILL.md) — quantitative market context alongside the brief
- [devdrops-document-summariser](../devdrops-document-summariser/SKILL.md) — summarise a specific URL once found
