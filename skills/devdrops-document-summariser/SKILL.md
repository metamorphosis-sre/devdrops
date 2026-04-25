---
name: devdrops-document-summariser
description: Extract clean text, metadata, and links from any URL, or get an AI-generated summary of any web page with structured key points.
---

## When to use this skill

- User wants to extract readable content from a web page, article, or report URL
- Agent needs to get the text of a page before processing it (e.g. before translation, classification, or analysis)
- User asks "summarise this article", "what does this page say?", "extract the content from [URL]"
- Agent is building a read-later pipeline, content monitor, or research ingestion workflow
- User has raw HTML and wants structured text/metadata extracted without fetching

## How it works

Two complementary endpoints:

**Extract** (`/api/extract/url`) fetches a URL and returns structured data: clean text (up to 10,000 chars), title, description, author, publish date, headings, and up to 20 links. No AI involved — pure HTML parsing. Costs $0.005. Results are cached 1 hour.

**Summarise** (`/api/summarize/url`) fetches a URL, extracts the content, and then calls Claude to produce a structured AI summary: title, summary paragraph(s), and key points. Costs $0.02. Results are cached 1 hour.

**Extract HTML** (`POST /api/extract/html`) accepts raw HTML in the request body and returns the same structured output as `/extract/url` — no outbound fetch required. Useful when you already have the HTML. Costs $0.005.

## Endpoints

| Method | Path | Price | Required params | Optional params |
|--------|------|-------|-----------------|-----------------|
| GET | `/api/extract/url` | $0.005 | `url` | — |
| POST | `/api/extract/html` | $0.005 | `html` (body) | `url` (body, for context) |
| GET | `/api/summarize/url` | $0.02 | `url` | `length` |

### Parameters

**`/api/extract/url` and `/api/summarize/url`**

| Param | Type | Description |
|-------|------|-------------|
| `url` | string | Full URL to fetch (must be `https://` or `http://`) |
| `length` | string | Summary length: `short`, `medium` (default), `long` |

**`POST /api/extract/html` body**

| Field | Type | Description |
|-------|------|-------------|
| `html` | string | Raw HTML content (required; max 500KB) |
| `url` | string | Original URL (optional; used for resolving relative links) |

### Extract response fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Page title (prefers OG title) |
| `description` | string | Meta description or OG description |
| `author` | string | Author name if found in meta tags |
| `published_date` | string | Publish date if found in meta tags |
| `headings` | array | Up to 10 h1–h3 headings |
| `links` | array | Up to 20 `{text, href}` objects |
| `text` | string | Clean extracted text (up to 10,000 chars) |
| `text_full_length` | number | Total extracted text length before truncation |
| `word_count` | number | Word count of extracted text |
| `og` | object | OpenGraph tags: `title`, `description`, `image`, `type` |

### Summarise response fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Page title |
| `summary` | string | AI-generated summary (length as requested) |
| `key_points` | array | 3–7 key point strings |
| `word_count` | number | Word count of source text |

## Quick start

### TypeScript — extract (free-tier eligible)

```typescript
import { wrapFetchWithPayment } from "@x402/fetch";
const pay = wrapFetchWithPayment(fetch, walletClient);

const res = await pay(
  "https://api.devdrops.run/api/extract/url?url=https://example.com/article"
);
const { data } = await res.json();
console.log(data.title, data.text.slice(0, 500));
```

### TypeScript — AI summarise

```typescript
const res = await pay(
  "https://api.devdrops.run/api/summarize/url?url=https://example.com/report&length=short"
);
const { data } = await res.json();
console.log(data.summary);
data.key_points.forEach((p: string) => console.log("•", p));
```

### TypeScript — extract from raw HTML

```typescript
const html = `<html><head><title>My Doc</title></head><body><article>Content here...</article></body></html>`;

const res = await pay("https://api.devdrops.run/api/extract/html", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ html, url: "https://example.com" }),
});
```

### curl

```bash
# Extract
curl -H "x-402-payment: <proof>" \
  "https://api.devdrops.run/api/extract/url?url=https://en.wikipedia.org/wiki/Artificial_intelligence"

# Summarise (short)
curl -H "x-402-payment: <proof>" \
  "https://api.devdrops.run/api/summarize/url?url=https://example.com/report&length=short"
```

## Examples

### Example 1: Extract article content

```
GET /api/extract/url?url=https://www.bbc.com/news/technology-article
```

```json
{
  "product": "extract",
  "cached": false,
  "data": {
    "url": "https://www.bbc.com/news/technology-article",
    "domain": "www.bbc.com",
    "title": "AI companies race to build next-generation models",
    "description": "Major technology firms are investing heavily in AI infrastructure...",
    "author": "Jane Smith",
    "published_date": "2026-04-24T09:00:00Z",
    "headings": ["AI companies race", "What the experts say", "What comes next"],
    "links": [
      { "text": "Read more on AI", "href": "https://www.bbc.com/news/technology" }
    ],
    "text": "Major technology firms are investing heavily in AI infrastructure...",
    "text_full_length": 4820,
    "word_count": 780,
    "og": {
      "title": "AI companies race to build next-generation models",
      "image": "https://ichef.bbci.co.uk/news/...",
      "type": "article"
    }
  }
}
```

### Example 2: AI summarise — short

```
GET /api/summarize/url?url=https://example.com/annual-report&length=short
```

```json
{
  "product": "summarize",
  "data": {
    "url": "https://example.com/annual-report",
    "domain": "example.com",
    "length": "short",
    "title": "Acme Corp Annual Report 2025",
    "summary": "Acme Corp reported 23% revenue growth in 2025, driven by expansion in Asia-Pacific markets. Operating margins improved to 18% from 14% as the company completed its cloud migration programme.",
    "key_points": [
      "Revenue grew 23% YoY to £4.2B",
      "Asia-Pacific now 31% of total revenue",
      "Operating margin up 4pp to 18%",
      "Cloud migration complete; £80M annual savings expected"
    ],
    "word_count": 6400
  }
}
```

### Example 3: Extract then process pipeline

```typescript
// Step 1: extract content
const extracted = await pay(
  `https://api.devdrops.run/api/extract/url?url=${encodeURIComponent(targetUrl)}`
).then(r => r.json());

// Step 2: use extracted text in downstream processing
const text = extracted.data.text;
// ... feed to classification, translation, search indexing, etc.
```

### Example 4: Batch URL summariser

```typescript
const urls = [
  "https://example.com/q1-report",
  "https://example.com/q2-report",
  "https://example.com/q3-report",
];

const summaries = await Promise.all(
  urls.map(url =>
    pay(`https://api.devdrops.run/api/summarize/url?url=${encodeURIComponent(url)}&length=short`)
      .then(r => r.json())
      .then(d => ({ url, summary: d.data?.summary, keyPoints: d.data?.key_points }))
  )
);
```

### Example 5: Extract from raw HTML (no outbound fetch)

```typescript
// Already have the HTML from your own fetch
const html = await myFetch(url);

const res = await pay("https://api.devdrops.run/api/extract/html", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ html, url }),
});
const { data } = await res.json();
```

## Errors & limits

| Status | Meaning |
|--------|---------|
| 402 | Payment required |
| 400 | Missing `url` or `html` parameter |
| 422 | Target URL does not return HTML (e.g. PDF, binary) |
| 502 | Target URL returned an error status |
| 503 | Claude API unavailable (summarise only) |
| 504 | Target URL timed out (15s limit for extract, 10s for summarise) |

**No free tier.** Extract costs $0.005; summarise costs $0.02.

**URL requirements:** Must be a public HTTP/HTTPS URL. Private IPs, localhost, and internal hostnames are blocked (SSRF protection). Maximum fetch size is not explicitly capped, but text is truncated at 10,000 chars for extract and 50,000 chars for summarise input.

**HTML body limit:** POST `/api/extract/html` accepts up to 500KB of HTML. The Worker enforces a 256KB POST body limit across the whole request; keep the JSON wrapper overhead in mind.

**Caching:** Both endpoints cache per-URL for 1 hour. Summarise also caches per-URL+length combination.

**PDF and binary:** These endpoints only parse HTML. To process PDFs, extract text client-side first and use `POST /api/extract/html` with the text wrapped in basic HTML tags.

## Related skills

- [devdrops-research-brief](../devdrops-research-brief/SKILL.md) — topic-based research (multi-source, not a single URL)
- [devdrops-regulatory-feeds](../devdrops-regulatory-feeds/SKILL.md) — find documents to then extract/summarise
