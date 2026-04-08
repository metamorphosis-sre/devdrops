# Sanctions Screening Outreach

## Target Segments

### 1. Crypto/DeFi compliance teams
These companies MUST screen every transaction against OFAC/UN/HMT lists. They currently pay $200-2000/month for screening APIs.

**Companies to contact:**
- Small crypto exchanges and on-ramps (not Coinbase — they have in-house)
- DeFi protocols with compliance requirements
- Crypto payment processors (MoonPay, Transak, Ramp, Sardine)
- Wallet providers doing KYC (Phantom, Rainbow, Zerion)

**Where to find them:**
- Search LinkedIn for "compliance officer" + "crypto" or "web3"
- Search AngelList/Wellfound for crypto startups with <50 employees
- r/ethdev, r/defi — compliance threads
- Telegram groups: DeFi compliance, crypto AML

### 2. Fintech startups
Any company moving money needs sanctions screening. Startups can't afford Dow Jones or Refinitiv.

**Companies to contact:**
- Neobanks (Monzo-like startups outside the big names)
- Payment startups (cross-border, B2B payments)
- Lending platforms
- Remittance services

**Where to find them:**
- ProductHunt launches tagged "fintech"
- Y Combinator company directory (filter: fintech, payments)
- LinkedIn Sales Navigator: "Head of Compliance" at companies with 10-100 employees

### 3. AI agent builders
Agents doing financial research or compliance checks need programmatic sanctions screening.

**Where to find them:**
- GitHub repos importing LangChain/CrewAI with compliance-related code
- Smithery users browsing finance/compliance tools

---

## Cold Email Template — Crypto/Fintech

**Subject:** Sanctions screening at $0.05/check — no contract, pay per query

Hi [Name],

I built a sanctions screening API that checks names against OFAC, UN Security Council, and UK HMT lists with fuzzy matching and confidence scores.

It costs $0.05 per check. No monthly fee, no contract, no minimum commitment.

Quick test (free, no signup):
```
curl "https://api.devdrops.run/api/sanctions/check?name=John+Smith"
```

Returns: match/no-match, confidence score, matched list, matched name, and match type (exact, alias, fuzzy).

How it compares:
- ComplyAdvantage: $500-2000/month
- Dow Jones Risk & Compliance: enterprise pricing
- DevDrops: $0.05/check — 10,000 checks = $500

For volume, we have prepaid bundles ($5/$25/$100) via Stripe at devdrops.run/buy, or pay-per-query in USDC on Base mainnet.

Worth a quick look? Happy to answer questions.

[Your name]
devdrops.run

---

## Cold Email Template — AI Agent Builders

**Subject:** Sanctions screening tool for your AI agent — $0.05/call via MCP

Hi [Name],

I noticed you're building [agent/tool]. If it touches financial data or compliance, you might need sanctions screening.

DevDrops has a universal MCP server with 18 tools including sanctions checks (OFAC, UN, UK HMT). Your agent can discover and call it over JSON-RPC:

```bash
# Free discovery
curl https://api.devdrops.run/api/mcp

# Tool call (returns match confidence, list, aliases)
POST /api/mcp { "method": "tools/call", "params": { "name": "check_sanctions", "arguments": { "name": "..." } } }
```

$0.01 per MCP tool call. Works with Claude, Cursor, any MCP client.

MCP server: https://smithery.ai/servers/@pchawla-a6su/devdrops
Full catalog: https://devdrops.run

[Your name]

---

## LinkedIn Post (for your own profile)

I built a sanctions screening API that costs $0.05 per check.

No monthly fee. No contract. No sales call.

It checks names against OFAC, UN Security Council, and UK HMT sanctions lists with fuzzy matching and returns confidence scores.

Compare that to the $500-2000/month most compliance APIs charge.

Try it right now (free, no signup needed):

curl "https://api.devdrops.run/api/sanctions/check?name=John+Smith"

If you're at a fintech, crypto company, or building AI agents that need compliance checks — this might save you a lot.

Built on Cloudflare Workers with x402 micropayments. Also available via Stripe at devdrops.run/buy.

#fintech #compliance #sanctions #api #aml

---

## Reddit Posts

### r/fintech
**Title:** I built a sanctions screening API at $0.05/check — no monthly fee, no contract

**Body:**
I built DevDrops, a set of data APIs including sanctions screening against OFAC, UN Security Council, and UK HMT lists.

The screening endpoint does fuzzy name matching with confidence scores, alias detection, and returns the specific list and entry that matched.

Pricing: $0.05 per check. No monthly fee, no minimum. Pay with credit card or USDC.

Compare: ComplyAdvantage starts at $500/month. Dow Jones is enterprise-only.

Free test (no signup): `curl "https://api.devdrops.run/api/sanctions/check?name=John+Smith"`

If you're doing KYC/AML at a startup and can't justify enterprise pricing yet, this might be useful.

https://devdrops.run

### r/compliance
**Title:** Pay-per-query sanctions screening API — OFAC, UN, UK HMT — $0.05/check

**Body:**
Built an API for sanctions list screening. Checks against OFAC SDN, UN Security Council, and UK HMT consolidated lists.

Features:
- Fuzzy name matching with configurable threshold
- Confidence scores (0-100)
- Alias detection
- Returns matched list, matched name, match type
- Updated regularly from official sources

$0.05 per check, no monthly fee. Available via Stripe (devdrops.run/buy) or programmatic micropayments.

Free to test: `curl "https://api.devdrops.run/api/sanctions/check?name=John+Smith"`

Would love feedback from compliance professionals on what would make this more useful. Thinking about adding EU sanctions lists, PEP screening, and batch checking.

https://devdrops.run
