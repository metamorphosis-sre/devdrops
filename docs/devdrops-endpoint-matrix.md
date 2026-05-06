# DevDrops Endpoint Reliability Matrix

Date: 2026-05-06

Source of truth: production `/catalog` plus route/pricing configuration.

## Summary

- Current catalog count: 43 products/endpoints
- x402 discovery: live
- OpenAPI: live
- Free metadata smoke: available via `npm run smoke:metadata`
- No paid calls are required for metadata validation

## Matrix

| Product | Representative endpoint | Price | Category | Upstream class | Risk notes |
|---|---|---:|---|---|---|
| Property Intelligence | `/api/property/uk/prices` | $0.01 | Domain Expertise | self-contained/public property data | England/Wales data freshness limitations |
| Property MCP | `/api/property/mcp` | $0.01 | MCP+Skills | self-contained/MCP wrapper | GET discovery free; POST tool calls paid |
| Prediction Markets | `/api/predictions/markets` | $0.005 | Data Aggregation | no-key public APIs | upstream availability varies |
| Sports Odds | `/api/odds/sports` | $0.005 | Data Aggregation | paid key | Odds API quota/cost exposure |
| Regulatory Feeds | `/api/regulatory/search` | $0.01 | Data Aggregation | free key/government APIs | Companies House key required |
| Events Calendar | `/api/calendar/upcoming` | $0.005 | Data Aggregation | scrape-dependent | monitor markup changes |
| Company Filings | `/api/filings/search` | $0.01 | Data Aggregation | free key/government APIs | not legal advice |
| Domain Lookup | `/api/domain/lookup/:domain` | $0.005 | Data Aggregation | no-key public protocols | RDAP/CT availability varies |
| Weather | `/api/weather/current` | $0.001 | Data Aggregation | free key | free-tier eligible; weather key required |
| FX Rates | `/api/fx/latest` | $0.001 | Data Aggregation | no-key public API | free-tier eligible |
| IP Geolocation | `/api/ip/me` | $0.001 | Data Aggregation | free key | free-tier eligible; IPinfo quota |
| History | `/api/history/today` | $0.001 | Data Aggregation | no-key public API | free-tier eligible |
| Academic Papers | `/api/papers/search` | $0.005 | Data Aggregation | no-key public APIs | OpenAlex/Semantic Scholar availability |
| Food & Nutrition | `/api/food/search` | $0.005 | Data Aggregation | no-key public API | health/nutrition data should be informational only |
| Public Tenders | `/api/tenders/search` | $0.01 | Data Aggregation | free public/government APIs | SAM.gov key may improve coverage |
| News Sentiment | `/api/sentiment/analyze` | $0.02 | AI-Enhanced | Claude-dependent | paid AI; cache/cost controls matter |
| Market Signals | `/api/signals/correlate` | $0.05 | AI-Enhanced | Claude-dependent | paid AI; not financial advice |
| Document Summarise | `/api/documents` | $0.10 | AI-Enhanced | Claude-dependent | paid AI; input size/cost risk |
| Location Intelligence | `/api/location/uk/report` | $0.02 | AI-Enhanced | public/keyed sources | UK-only assumptions |
| Research Brief | `/api/research/brief` | $0.10 | AI-Enhanced | Claude-dependent | paid AI; source limitations |
| Translation | `/api/translate` | $0.005 | Utility | public instance/self-hostable | public LibreTranslate reliability varies |
| Email Verify | `/api/email-verify/check/:email` | $0.005 | Utility | DNS/self-contained | no email sending |
| QR Generator | `/api/qr/generate` | $0.001 | Utility | no-key/public utility | free-tier eligible |
| Crypto Prices | `/api/crypto/price/bitcoin` | $0.001 | Utility | no-key public API | not financial advice |
| Time & Timezone | `/api/time/now` | $0.001 | Utility | self-contained/free public holidays | free-tier eligible |
| VAT Check | `/api/vat/check/:number` | $0.01 | Intelligence | no-key government APIs | not tax advice |
| Stock Quotes | `/api/stocks/quote/:ticker` | $0.005 | Intelligence | unofficial/free upstream | not financial advice; upstream fragility |
| Content Extract | `/api/extract/url` | $0.005 | Intelligence | controlled public fetch | SSRF guard required; ToS sensitivity |
| Sanctions Screen | `/api/sanctions/check` | $0.05 | Intelligence | public government lists | not compliance determination |
| Company Enrichment | `/api/company/search` | $0.02 | Intelligence | free key/government API | UK Companies House focus |
| ASN / BGP | `/api/asn/ip/:ip` | $0.005 | Data Aggregation | no-key public API | upstream rate limits |
| Economic Indicators | `/api/economy/indicator` | $0.005 | Data Aggregation | no-key public API | World Bank coverage gaps |
| Image Generate | `/api/image/generate` | $0.02 | AI-Enhanced | Workers AI-dependent | paid AI/platform usage |
| LLM Complete | `/api/inference/complete` | $0.005 | AI-Enhanced | Workers AI-dependent | paid AI/platform usage |
| LLM Chat | `/api/inference/chat` | $0.005 | AI-Enhanced | Workers AI-dependent | paid AI/platform usage |
| Utilities | `/api/utils/uuid` | $0.001 | Utility | self-contained | low risk |
| Summarize URL | `/api/summarize/url` | $0.02 | AI-Enhanced | public fetch + Claude | paid AI; ToS/source constraints |
| Text Classify | `/api/classify` | $0.02 | AI-Enhanced | Claude-dependent | paid AI |
| Entity Extract | `/api/entities` | $0.02 | AI-Enhanced | Claude-dependent | paid AI |
| Universal MCP | `/api/mcp` | $0.01 | MCP+Skills | wrapper/payment-dependent | discovery free; tool calls paid |
| Starter Bundle | `/api/credits/purchase/starter` | $5.00 | Credits | Stripe/payment-dependent | no secret exposure |
| Pro Bundle | `/api/credits/purchase/pro` | $25.00 | Credits | Stripe/payment-dependent | no secret exposure |
| Business Bundle | `/api/credits/purchase/business` | $100.00 | Credits | Stripe/payment-dependent | no secret exposure |

## Smoke Test Policy

Metadata smoke tests should call only:

- `/health`
- `/catalog`
- `/openapi.json`
- `/.well-known/x402`
- `/.well-known/mcp.json`
- `/.well-known/mcp/server-card.json`

Product endpoint smoke tests should accept either `200` for free-tier availability or `402` for payment-required responses. Do not run paid x402 transactions automatically.
