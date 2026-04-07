import { Hono } from "hono";
import { paymentMiddlewareFromConfig } from "@x402/hono";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { cdpAuthHeaders } from "./lib/cdp-auth";
import type { Env } from "./types";
import { buildX402Routes } from "./middleware/payment";
import { corsMiddleware } from "./middleware/cors";
import { transactionLogger } from "./middleware/logging";
import { handleScheduled } from "./cron/handler";
import { UpstreamError } from "./lib/fetch";

// Free routes
import health from "./routes/health";
import catalog from "./routes/catalog";
import openapi from "./routes/openapi";
import wellKnown from "./routes/well-known";

// Group A: Free APIs (no key needed)
import fx from "./routes/fx";
import history from "./routes/history";
import papers from "./routes/papers";
import food from "./routes/food";
import domain from "./routes/domain";
import ip from "./routes/ip";
import emailVerify from "./routes/email-verify";
import predictions from "./routes/predictions";
import filings from "./routes/filings";
import translate from "./routes/translate";
import tenders from "./routes/tenders";

// Group B: API key required
import weather from "./routes/weather";
import odds from "./routes/odds";
import calendar from "./routes/calendar";
import regulatory from "./routes/regulatory";
import property from "./routes/property";
import propertyMcp from "./routes/property-mcp";
import location from "./routes/location";

// Group C: AI-enhanced (Anthropic API key)
import sentiment from "./routes/sentiment";
import documents from "./routes/documents";
import research from "./routes/research";
import signals from "./routes/signals";

// Group D: New utility products
import qr from "./routes/qr";
import crypto from "./routes/crypto";
import time from "./routes/time";

// Group E: New data/intelligence products
import vat from "./routes/vat";
import stocks from "./routes/stocks";
import extract from "./routes/extract";
import sanctions from "./routes/sanctions";
import company from "./routes/company";


const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use("*", corsMiddleware);

// Landing page at root
app.get("/", (c) => c.html(LANDING_HTML));

// Free routes (no payment required)
app.route("/health", health);
app.route("/catalog", catalog);
app.route("/openapi.json", openapi);
app.route("/.well-known", wellKnown);

// Admin route — outside /api/* so payment middleware never runs
app.get("/admin/sanctions/refresh", async (c) => {
  const { refreshSanctionsList } = await import("./routes/sanctions");
  const count = await refreshSanctionsList(c.env.CACHE);
  return c.json({ refreshed: true, entries_loaded: count, timestamp: new Date().toISOString() });
});

// x402 payment middleware on all /api/* routes
// Skipped in development (facilitator requires on-chain scheme registration)
app.use("/api/*", async (c, next) => {
  // MCP capability discovery (GET exact path) must be free — agents need to discover
  // tools before they can fund a wallet. POST (JSON-RPC tool calls) stays gated.
  if (c.req.method === "GET" && c.req.path === "/api/property/mcp") {
    return next();
  }

  if (c.env.ENVIRONMENT === "development") {
    return next();
  }

  const payTo = c.env.PAY_TO_ADDRESS;
  const network = c.env.NETWORK;
  const facilitatorUrl = c.env.FACILITATOR_URL;

  if (!payTo) {
    return c.json({ error: "Server misconfigured: PAY_TO_ADDRESS not set" }, 500);
  }

  const routes = buildX402Routes(payTo, network);
  const facilitatorConfig: { url: string; createAuthHeaders?: () => Promise<Record<string, Record<string, string>>> } = { url: facilitatorUrl };
  if (c.env.CDP_API_KEY_ID && c.env.CDP_API_KEY_SECRET) {
    facilitatorConfig.createAuthHeaders = cdpAuthHeaders(c.env.CDP_API_KEY_ID, c.env.CDP_API_KEY_SECRET);
  }
  const facilitator = new HTTPFacilitatorClient(facilitatorConfig as any);
  const schemes = [{ network, server: new ExactEvmScheme() }];
  // @x402/extensions/bazaar is dynamically imported by the middleware when extensions.bazaar
  // is present in route configs — esbuild bundles the import; errors are caught and logged.
  const middleware = paymentMiddlewareFromConfig(routes as any, facilitator, schemes as any);
  return middleware(c, next);
});

// Transaction logging (runs after payment middleware)
app.use("/api/*", transactionLogger);

// Mount all 22 product routers
// Group A: Free APIs
app.route("/api/fx", fx);
app.route("/api/history", history);
app.route("/api/papers", papers);
app.route("/api/food", food);
app.route("/api/domain", domain);
app.route("/api/ip", ip);
app.route("/api/email-verify", emailVerify);
app.route("/api/predictions", predictions);
app.route("/api/filings", filings);
app.route("/api/translate", translate);
app.route("/api/tenders", tenders);

// Group B: API key required
app.route("/api/weather", weather);
app.route("/api/odds", odds);
app.route("/api/calendar", calendar);
app.route("/api/regulatory", regulatory);
app.route("/api/property/mcp", propertyMcp); // mount before /api/property so /mcp isn't swallowed
app.route("/api/property", property);
app.route("/api/location", location);

// Group C: AI-enhanced
app.route("/api/sentiment", sentiment);
app.route("/api/documents", documents);
app.route("/api/research", research);
app.route("/api/signals", signals);

// Group D: New utility products
app.route("/api/qr", qr);
app.route("/api/crypto", crypto);
app.route("/api/time", time);

// Group E: New data/intelligence products
app.route("/api/vat", vat);
app.route("/api/stocks", stocks);
app.route("/api/extract", extract);
app.route("/api/sanctions", sanctions);
app.route("/api/company", company);

// Catch-all for unmatched API routes
app.all("/api/*", (c) => {
  return c.json({ error: "Endpoint not found", catalog: "/catalog" }, 404);
});

// Global error handler — catches UpstreamError from any route that doesn't have its own try/catch
app.onError((err, c) => {
  if (err instanceof UpstreamError) {
    return c.json(
      { error: "Upstream service error", upstream_status: err.status, detail: err.message },
      502
    );
  }
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

// Export handlers
export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
};

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DevDrops — x402 Data APIs for the Agent Economy</title>
<meta name="description" content="30 pay-per-query data APIs powered by x402 micropayments. Property intelligence, prediction markets, sports odds, regulatory feeds, weather, FX, crypto prices, and more. No API keys. No subscriptions. Just USDC.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
--bg:#0a0a0b;--bg2:#111113;--bg3:#1a1a1e;
--text:#e8e6e1;--text2:#9d9b95;--text3:#5c5b57;
--accent:#22c55e;--accent2:#16a34a;--accent-dim:rgba(34,197,94,.08);
--blue:#3b82f6;--amber:#f59e0b;--coral:#f97316;--purple:#a855f7;
--border:#222224;--border2:#2a2a2e;
--mono:'JetBrains Mono',monospace;--serif:'Instrument Serif',Georgia,serif;
--radius:6px;
}
body{background:var(--bg);color:var(--text);font-family:var(--mono);font-size:14px;line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}

body::after{content:'';position:fixed;inset:0;pointer-events:none;opacity:.03;background:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");z-index:9999}

.container{max-width:900px;margin:0 auto;padding:0 24px}

header{padding:20px 0;border-bottom:1px solid var(--border)}
.header-inner{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.logo{font-size:15px;font-weight:700;letter-spacing:-.5px;color:var(--text)}
.logo span{color:var(--accent)}
.header-links{display:flex;gap:16px;align-items:center}
.header-links a{font-size:12px;color:var(--text3)}
.header-links a:hover{color:var(--text)}
.header-tag{font-size:11px;color:var(--text3);border:1px solid var(--border);padding:3px 10px;border-radius:20px}

.hero{padding:80px 0 60px;border-bottom:1px solid var(--border)}
.hero h1{font-family:var(--serif);font-size:clamp(40px,6vw,64px);font-weight:400;line-height:1.1;letter-spacing:-.02em;color:var(--text);margin-bottom:20px}
.hero h1 em{font-style:italic;color:var(--accent)}
.hero-sub{font-size:15px;color:var(--text2);max-width:560px;line-height:1.7;margin-bottom:32px}
.hero-code{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px 20px;font-size:13px;color:var(--text2);overflow-x:auto}
.hero-code .comment{color:var(--text3)}
.hero-code .kw{color:var(--accent)}
.hero-code .str{color:var(--amber)}
.hero-code .num{color:var(--coral)}

.stats{display:flex;gap:40px;padding:32px 0;border-bottom:1px solid var(--border);flex-wrap:wrap}
.stat{display:flex;flex-direction:column;gap:2px}
.stat-val{font-size:20px;font-weight:700;color:var(--text)}
.stat-label{font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px}

.products{padding:60px 0}
.section-label{font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px}
.section-title{font-family:var(--serif);font-size:28px;font-weight:400;margin-bottom:8px}
.section-sub{font-size:13px;color:var(--text3);margin-bottom:32px}

.tier-label{font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1.5px;margin:40px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--border)}
.tier-label:first-of-type{margin-top:0}

.product-grid{display:grid;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:1px}
@media(min-width:640px){.product-grid{grid-template-columns:1fr 1fr}}

.product{background:var(--bg);padding:24px;transition:background .2s}
.product:hover{background:var(--bg2)}
.product-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
.product-name{font-size:13px;font-weight:700;color:var(--text)}
.product-price{font-size:11px;color:var(--accent);white-space:nowrap;background:var(--accent-dim);padding:2px 8px;border-radius:3px}
.product-desc{font-size:12px;color:var(--text2);line-height:1.6}
.product-tag{display:inline-block;font-size:10px;padding:2px 6px;border-radius:3px;margin-top:8px;text-transform:uppercase;letter-spacing:.5px}
.tag-gap{background:rgba(249,115,22,.1);color:var(--coral)}
.tag-new{background:rgba(59,130,246,.1);color:var(--blue)}
.tag-premium{background:rgba(168,85,247,.1);color:var(--purple)}
.tag-free{background:rgba(34,197,94,.08);color:var(--accent)}

.how{padding:60px 0;border-top:1px solid var(--border)}
.steps{display:grid;gap:24px;margin-top:24px}
@media(min-width:640px){.steps{grid-template-columns:1fr 1fr 1fr}}
.step{border:1px solid var(--border);border-radius:var(--radius);padding:24px}
.step-num{font-size:32px;font-weight:700;color:var(--border2);margin-bottom:8px}
.step h3{font-size:13px;font-weight:700;margin-bottom:6px}
.step p{font-size:12px;color:var(--text2);line-height:1.6}

.stack{padding:60px 0;border-top:1px solid var(--border)}
.stack-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.stack-item{font-size:11px;padding:6px 12px;border:1px solid var(--border);border-radius:3px;color:var(--text2)}

.cta{padding:60px 0;border-top:1px solid var(--border);text-align:center}
.cta h2{font-family:var(--serif);font-size:32px;font-weight:400;margin-bottom:12px}
.cta p{color:var(--text2);font-size:13px;margin-bottom:24px}
.cta-links{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.cta-btn{display:inline-block;background:var(--accent);color:var(--bg);font-family:var(--mono);font-size:13px;font-weight:700;padding:12px 32px;border-radius:var(--radius);transition:background .2s}
.cta-btn:hover{background:var(--accent2);text-decoration:none}
.cta-btn-ghost{display:inline-block;border:1px solid var(--border);color:var(--text2);font-family:var(--mono);font-size:13px;padding:12px 32px;border-radius:var(--radius);transition:border-color .2s}
.cta-btn-ghost:hover{border-color:var(--text3);text-decoration:none}

footer{padding:24px 0;border-top:1px solid var(--border)}

@media(max-width:639px){
.stats{gap:24px}
.hero{padding:48px 0 40px}
.products,.how,.stack,.cta{padding:40px 0}
}
</style>
</head>
<body>

<header>
<div class="container header-inner">
<div class="logo">dev<span>drops</span>.run</div>
<div class="header-links">
<a href="/catalog">Catalog</a>
<a href="/openapi.json">OpenAPI</a>
<a href="/health">Status</a>
</div>
<div class="header-tag">x402 · USDC on Base</div>
</div>
</header>

<section class="hero">
<div class="container">
<h1>Data APIs that <em>agents pay for</em></h1>
<p class="hero-sub">30 pay-per-query intelligence feeds powered by x402 micropayments. No API keys. No subscriptions. No human in the loop. Your agent sends a request, pays USDC, gets data.</p>
<div class="hero-code">
<span class="comment">// One request. Instant data. Fractions of a cent.</span><br>
<span class="kw">const</span> pay = wrapFetchWithPayment(fetch, client);<br>
<span class="kw">const</span> res = <span class="kw">await</span> pay(<br>
&nbsp;&nbsp;<span class="str">"https://api.devdrops.run/api/predictions/markets"</span><br>
);<br><br>
<span class="comment">// → { polymarket: [...], manifold: [...] }</span><br>
<span class="comment">// Cost: $0.005 USDC — settled on Base in &lt;2 seconds</span>
</div>
</div>
</section>

<div class="container">
<div class="stats">
<div class="stat"><span class="stat-val">30</span><span class="stat-label">Data products</span></div>
<div class="stat"><span class="stat-val">$0.001</span><span class="stat-label">Starting price</span></div>
<div class="stat"><span class="stat-val">&lt;2s</span><span class="stat-label">Settlement</span></div>
<div class="stat"><span class="stat-val">0</span><span class="stat-label">API keys needed</span></div>
</div>
</div>

<section class="products">
<div class="container">
<div class="section-label">Products</div>
<div class="section-title">Intelligence feeds for the agent economy</div>
<p class="section-sub">All endpoints: GET /api/{product}/… · Pay in USDC on Base · <a href="/catalog">Machine-readable catalog →</a></p>

<div class="tier-label">Tier 1 — Domain Expertise</div>
<div class="product-grid">
<div class="product">
<div class="product-head"><span class="product-name">Property intelligence</span><span class="product-price">$0.01</span></div>
<p class="product-desc">UK property prices, ownership lookups, House Price Index by region. Land Registry + Companies House data.</p>
<span class="product-tag tag-gap">No competition</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Address intelligence</span><span class="product-price">$0.02</span></div>
<p class="product-desc">Submit a UK address → flood risk, crime stats, school ratings, transport links. Environment Agency + Police API.</p>
<span class="product-tag tag-gap">Market gap</span>
</div>
</div>

<div class="tier-label">Tier 2 — Data Aggregation</div>
<div class="product-grid">
<div class="product">
<div class="product-head"><span class="product-name">Prediction market feed</span><span class="product-price">$0.005</span></div>
<p class="product-desc">Active markets from Polymarket and Manifold, normalised. Cross-platform spreads and search in one endpoint.</p>
<span class="product-tag tag-gap">Dome acquired — gap open</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Sports betting odds</span><span class="product-price">$0.005</span></div>
<p class="product-desc">Cross-bookmaker odds comparison. Football, basketball, tennis, cricket. Live scores included.</p>
<span class="product-tag tag-new">First x402-native</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Regulatory intelligence</span><span class="product-price">$0.01</span></div>
<p class="product-desc">Companies House, SEC EDGAR, FCA notices. Structured change feeds for compliance agents.</p>
<span class="product-tag tag-gap">Market gap</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Company filings & ownership</span><span class="product-price">$0.01</span></div>
<p class="product-desc">Real-time filing alerts, beneficial ownership lookups, director changes. Due diligence in one query.</p>
<span class="product-tag tag-gap">Market gap</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Financial events calendar</span><span class="product-price">$0.005</span></div>
<p class="product-desc">FOMC, ECB, BoE decisions. Earnings dates. Economic data releases. Machine-readable JSON.</p>
<span class="product-tag tag-new">First x402-native</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Domain & web intelligence</span><span class="product-price">$0.005</span></div>
<p class="product-desc">WHOIS, DNS records, SSL certs via RDAP and crt.sh. No subscription needed.</p>
<span class="product-tag tag-new">First x402-native</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Public tenders</span><span class="product-price">$0.01</span></div>
<p class="product-desc">Government contract opportunities. UK Contracts Finder + SAM.gov (US). Search and recent feeds.</p>
<span class="product-tag tag-gap">Market gap</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Academic papers</span><span class="product-price">$0.005</span></div>
<p class="product-desc">Search academic literature via OpenAlex and Semantic Scholar. Abstracts, citations, DOIs, open access links.</p>
<span class="product-tag tag-new">First x402-native</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Email verification</span><span class="product-price">$0.005</span></div>
<p class="product-desc">Syntax validation, MX record check, disposable domain detection. No SMTP. Self-contained.</p>
<span class="product-tag tag-new">First x402-native</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Text translation</span><span class="product-price">$0.005</span></div>
<p class="product-desc">Translate text across 100+ languages via LibreTranslate. Language auto-detection included.</p>
<span class="product-tag tag-new">First x402-native</span>
</div>
</div>

<div class="tier-label">Tier 2 — Utility Data (High Volume)</div>
<div class="product-grid">
<div class="product">
<div class="product-head"><span class="product-name">Weather data</span><span class="product-price">$0.001</span></div>
<p class="product-desc">Current conditions and 5-day forecasts by city or coordinates. Cached at edge.</p>
<span class="product-tag tag-free">$0.001/query</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Currency & FX rates</span><span class="product-price">$0.001</span></div>
<p class="product-desc">33 major currencies, ECB reference rates. Historical rates back to 1999. Convert between any pair.</p>
<span class="product-tag tag-free">$0.001/query</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">IP geolocation</span><span class="product-price">$0.001</span></div>
<p class="product-desc">Country, region, city, timezone, ISP. Lookup any IP or auto-detect the requesting agent's IP.</p>
<span class="product-tag tag-free">$0.001/query</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Historical events</span><span class="product-price">$0.001</span></div>
<p class="product-desc">"On this day" events, births, and deaths via Wikipedia. By date or today. Edge-cached.</p>
<span class="product-tag tag-free">$0.001/query</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Crypto prices</span><span class="product-price">$0.001</span></div>
<p class="product-desc">Live token prices, market cap, 24h change, exchange markets. BTC, ETH, SOL and 2000+ tokens via CoinCap.</p>
<span class="product-tag tag-new">First x402-native</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">QR code generator</span><span class="product-price">$0.001</span></div>
<p class="product-desc">Generate QR codes from any text or URL. Returns SVG, PNG, or base64 JSON. No upload, serverless.</p>
<span class="product-tag tag-new">First x402-native</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Timezone & holidays</span><span class="product-price">$0.001</span></div>
<p class="product-desc">Current time in any IANA timezone. Public holidays for 100+ countries. Business day checks. Time conversion.</p>
<span class="product-tag tag-new">First x402-native</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Food & nutrition</span><span class="product-price">$0.005</span></div>
<p class="product-desc">3M+ products via Open Food Facts. Calories, allergens, ingredients. Lookup by barcode or name.</p>
<span class="product-tag tag-new">First x402-native</span>
</div>
</div>

<div class="tier-label">Tier 3 — AI-Enhanced (Premium)</div>
<div class="product-grid">
<div class="product">
<div class="product-head"><span class="product-name">News sentiment analysis</span><span class="product-price">$0.02</span></div>
<p class="product-desc">AI-powered sentiment scoring for any ticker, company, or topic. Structured scores with source attribution.</p>
<span class="product-tag tag-premium">Claude-powered</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Cross-market signals</span><span class="product-price">$0.05</span></div>
<p class="product-desc">Prediction odds + news sentiment + events = correlation signals. What might move this market?</p>
<span class="product-tag tag-premium">Claude-powered</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Document summariser</span><span class="product-price">$0.10</span></div>
<p class="product-desc">Submit a contract, planning doc, or filing. Structured summary: key terms, risks, obligations, deadlines.</p>
<span class="product-tag tag-premium">Claude-powered</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Research brief generator</span><span class="product-price">$0.10</span></div>
<p class="product-desc">Submit a topic → structured research brief with key facts, recent developments, source links, and analysis.</p>
<span class="product-tag tag-premium">Claude-powered</span>
</div>
<div class="product" style="grid-column:1/-1">
<div class="product-head"><span class="product-name">Property MCP server</span><span class="product-price">$0.01</span></div>
<p class="product-desc">Property intelligence exposed as MCP tools. Claude, GPT, and Gemini agents call it natively without REST boilerplate.</p>
<span class="product-tag tag-gap">No competition</span>
</div>
</div>

<div class="tier-label">Tier 4 — New Intelligence Products</div>
<div class="product-grid">
<div class="product">
<div class="product-head"><span class="product-name">VAT number verification</span><span class="product-price">$0.01</span></div>
<p class="product-desc">Verify EU and UK VAT numbers. Returns registered business name and address via EU VIES and UK HMRC APIs.</p>
<span class="product-tag tag-new">First x402-native</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Stock prices & markets</span><span class="product-price">$0.005</span></div>
<p class="product-desc">Live quotes, historical prices, market movers. 10,000+ tickers. Search by company name. Not financial advice.</p>
<span class="product-tag tag-new">First x402-native</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">URL content extractor</span><span class="product-price">$0.005</span></div>
<p class="product-desc">Submit any URL → get clean text, title, author, publish date, headings, links. Ad-stripping included.</p>
<span class="product-tag tag-new">First x402-native</span>
</div>
<div class="product">
<div class="product-head"><span class="product-name">Sanctions screening</span><span class="product-price">$0.05</span></div>
<p class="product-desc">Fuzzy name matching against OFAC SDN, UN Security Council, and UK HMT sanctions lists. Confidence scores included.</p>
<span class="product-tag tag-gap">No x402 alternative</span>
</div>
<div class="product" style="grid-column:1/-1">
<div class="product-head"><span class="product-name">Company enrichment</span><span class="product-price">$0.02</span></div>
<p class="product-desc">Full UK company profile: officers, PSCs, charges, filings. Search by name. Enrich from domain. Companies House + OpenCorporates.</p>
<span class="product-tag tag-gap">Market gap</span>
</div>
</div>

</div>
</section>

<section class="how" id="quickstart">
<div class="container">
<div class="section-label">Quick start</div>
<div class="section-title">Zero to first paid request.</div>
<div class="steps" style="margin-bottom:32px">
<div class="step">
<div class="step-num">JS</div>
<h3>Node.js / Bun</h3>
<div class="hero-code" style="margin-top:8px;font-size:12px">
<span class="kw">npm</span> install @x402/fetch @x402/evm viem<br><br>
<span class="kw">import</span> { wrapFetchWithPayment, x402Client } <span class="kw">from</span> <span class="str">'@x402/fetch'</span>;<br>
<span class="kw">import</span> { ExactEvmScheme, toClientEvmSigner } <span class="kw">from</span> <span class="str">'@x402/evm'</span>;<br>
<span class="kw">import</span> { privateKeyToAccount } <span class="kw">from</span> <span class="str">'viem/accounts'</span>;<br><br>
<span class="kw">const</span> account = privateKeyToAccount(<span class="str">'0xYOUR_PRIVATE_KEY'</span>);<br>
<span class="kw">const</span> signer = toClientEvmSigner(account);<br>
<span class="kw">const</span> client = <span class="kw">new</span> x402Client();<br>
client.register(<span class="str">'eip155:8453'</span>, <span class="kw">new</span> ExactEvmScheme(signer));<br><br>
<span class="kw">const</span> pay = wrapFetchWithPayment(fetch, client);<br>
<span class="kw">const</span> res = <span class="kw">await</span> pay(<span class="str">'https://api.devdrops.run/api/fx/latest'</span>);<br>
<span class="kw">const</span> data = <span class="kw">await</span> res.json();
</div>
</div>
<div class="step">
<div class="step-num">curl</div>
<h3>Raw 402 flow</h3>
<div class="hero-code" style="margin-top:8px;font-size:12px">
<span class="comment"># See the payment challenge</span><br>
curl https://api.devdrops.run/api/fx/latest<br><br>
<span class="comment"># Returns HTTP 402 with payment instructions:</span><br>
<span class="comment"># { accepts: [{ scheme: "exact",</span><br>
<span class="comment">#   price: "$0.001", network: "eip155:8453",</span><br>
<span class="comment">#   payTo: "0x..." }] }</span>
</div>
</div>
<div class="step">
<div class="step-num">test</div>
<h3>Try for free (testnet)</h3>
<p style="font-size:12px;color:var(--text2);margin-top:8px">Get free test USDC from <a href="https://faucet.circle.com/">Circle's faucet</a>. Point your x402 client at <code style="font-size:11px">ENVIRONMENT=development</code> to skip payment and test data responses locally with <code style="font-size:11px">wrangler dev</code>.</p>
<p style="font-size:12px;color:var(--text2);margin-top:8px">New to crypto wallets? Install <a href="https://www.coinbase.com/wallet">Coinbase Wallet</a>, buy a small amount of USDC on Base, then use the private key with @x402/fetch.</p>
</div>
</div>

<div class="section-label" style="margin-top:40px">How it works</div>
<div class="section-title">Three steps. No signup.</div>
<div class="steps">
<div class="step">
<div class="step-num">01</div>
<h3>Request</h3>
<p>Send a standard HTTP GET or POST to any DevDrops endpoint. No API key, no auth header, no account needed.</p>
</div>
<div class="step">
<div class="step-num">02</div>
<h3>Pay</h3>
<p>Server responds with HTTP 402. Your agent signs a USDC micropayment on Base. Costs fractions of a cent.</p>
</div>
<div class="step">
<div class="step-num">03</div>
<h3>Receive</h3>
<p>Payment verified on-chain in &lt;2 seconds. Structured JSON returned. Edge-cached for repeat queries.</p>
</div>
</div>
</div>
</section>

<section class="stack">
<div class="container">
<div class="section-label">Infrastructure</div>
<div class="section-title">Built on open standards</div>
<div class="stack-grid">
<span class="stack-item">x402 Protocol</span>
<span class="stack-item">USDC on Base</span>
<span class="stack-item">Cloudflare Workers</span>
<span class="stack-item">Cloudflare D1</span>
<span class="stack-item">Hono Framework</span>
<span class="stack-item">Coinbase Facilitator</span>
<span class="stack-item">OpenAPI 3.1</span>
<span class="stack-item">MCP Compatible</span>
</div>
</div>
</section>

<section class="cta">
<div class="container">
<h2>Start querying</h2>
<p>Fund an agent wallet with USDC on Base. Hit any endpoint. Pay per request.</p>
<div class="cta-links">
<a href="/catalog" class="cta-btn">View API catalog →</a>
<a href="/openapi.json" class="cta-btn-ghost">OpenAPI spec</a>
</div>
</div>
</section>

<footer>
<div class="container" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
<span style="font-size:11px;color:var(--text3)">© 2026 DevDrops</span>
<span style="font-size:11px;color:var(--text3)">
<a href="/health" style="color:var(--text3)">Status</a>
&nbsp;·&nbsp;
<a href="/openapi.json" style="color:var(--text3)">OpenAPI</a>
&nbsp;·&nbsp;
<a href="/catalog" style="color:var(--text3)">Catalog</a>
&nbsp;·&nbsp;
x402 · Base · Cloudflare
</span>
</div>
</footer>

</body>
</html>
`
