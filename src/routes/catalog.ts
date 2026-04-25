import { Hono } from "hono";
import type { Env } from "../types";
import { pricingMap, manifestLeafPaths } from "../middleware/payment";
import { FREE_TIER_PREFIXES, FREE_QUERIES_PER_DAY } from "../middleware/freetier";

const catalog = new Hono<{ Bindings: Env }>();

// Tier labels match MASTER.md C.3 framing exactly.
// Ship report flags: property/mcp placed in MCP+Skills (could be Domain Expertise);
// asn/* and economy/* placed in Data Aggregation (Group F comment ambiguous vs Intelligence).
const TIER_ORDER = [
  "Domain Expertise",
  "Data Aggregation",
  "Utility",
  "AI-Enhanced",
  "Intelligence",
  "MCP+Skills",
  "Credits",
] as const;
type Tier = (typeof TIER_ORDER)[number];

const TIER_MAP: Record<string, Tier> = {
  "GET /api/property/*":                 "Domain Expertise",

  "GET /api/predictions/*":              "Data Aggregation",
  "GET /api/odds/*":                     "Data Aggregation",
  "GET /api/regulatory/*":               "Data Aggregation",
  "GET /api/calendar/*":                 "Data Aggregation",
  "GET /api/filings/*":                  "Data Aggregation",
  "GET /api/domain/*":                   "Data Aggregation",
  "GET /api/weather/*":                  "Data Aggregation",
  "GET /api/fx/*":                       "Data Aggregation",
  "GET /api/ip/*":                       "Data Aggregation",
  "GET /api/history/*":                  "Data Aggregation",
  "GET /api/papers/*":                   "Data Aggregation",
  "GET /api/food/*":                     "Data Aggregation",
  "GET /api/tenders/*":                  "Data Aggregation",
  "GET /api/asn/*":                      "Data Aggregation",
  "GET /api/economy/*":                  "Data Aggregation",

  "POST /api/translate/*":               "Utility",
  "GET /api/email-verify/*":             "Utility",
  "GET /api/qr/*":                       "Utility",
  "GET /api/crypto/*":                   "Utility",
  "GET /api/time/*":                     "Utility",
  "GET /api/utils/*":                    "Utility",

  "GET /api/sentiment/*":                "AI-Enhanced",
  "POST /api/sentiment/*":               "AI-Enhanced",
  "GET /api/signals/*":                  "AI-Enhanced",
  "POST /api/documents/*":               "AI-Enhanced",
  "GET /api/location/*":                 "AI-Enhanced",
  "GET /api/research/*":                 "AI-Enhanced",
  "POST /api/research/*":                "AI-Enhanced",
  "POST /api/image/generate":            "AI-Enhanced",
  "POST /api/inference/complete":        "AI-Enhanced",
  "POST /api/inference/chat":            "AI-Enhanced",
  "GET /api/summarize/*":                "AI-Enhanced",
  "POST /api/classify/*":                "AI-Enhanced",
  "POST /api/entities/*":                "AI-Enhanced",

  "GET /api/vat/*":                      "Intelligence",
  "GET /api/stocks/*":                   "Intelligence",
  "GET /api/extract/*":                  "Intelligence",
  "POST /api/extract/*":                 "Intelligence",
  "GET /api/sanctions/*":                "Intelligence",
  "GET /api/company/*":                  "Intelligence",

  "GET /api/property/mcp/*":             "MCP+Skills",
  "POST /api/property/mcp":              "MCP+Skills",
  "POST /api/mcp":                       "MCP+Skills",

  "POST /api/credits/purchase/starter":  "Credits",
  "POST /api/credits/purchase/pro":      "Credits",
  "POST /api/credits/purchase/business": "Credits",
};

const NAME_MAP: Record<string, string> = {
  "GET /api/property/*":                 "Property Intelligence",
  "GET /api/property/mcp/*":             "Property MCP",
  "GET /api/predictions/*":              "Prediction Markets",
  "GET /api/odds/*":                     "Sports Odds",
  "GET /api/regulatory/*":              "Regulatory Feeds",
  "GET /api/calendar/*":                 "Events Calendar",
  "GET /api/filings/*":                  "Company Filings",
  "GET /api/domain/*":                   "Domain Lookup",
  "GET /api/weather/*":                  "Weather",
  "GET /api/fx/*":                       "FX Rates",
  "GET /api/ip/*":                       "IP Geolocation",
  "GET /api/history/*":                  "History",
  "GET /api/papers/*":                   "Academic Papers",
  "GET /api/food/*":                     "Food & Nutrition",
  "GET /api/tenders/*":                  "Tenders",
  "GET /api/sentiment/*":                "News Sentiment",
  "GET /api/signals/*":                  "Market Signals",
  "POST /api/documents/*":               "Document Summarise",
  "GET /api/location/*":                 "Location Intelligence",
  "GET /api/research/*":                 "Research Brief",
  "POST /api/translate/*":               "Translation",
  "GET /api/email-verify/*":             "Email Verify",
  "GET /api/qr/*":                       "QR Generator",
  "GET /api/crypto/*":                   "Crypto Prices",
  "GET /api/time/*":                     "Time & Timezone",
  "GET /api/vat/*":                      "VAT Check",
  "GET /api/stocks/*":                   "Stock Quotes",
  "GET /api/extract/*":                  "Content Extract",
  "GET /api/sanctions/*":                "Sanctions Screen",
  "GET /api/company/*":                  "Company Enrichment",
  "GET /api/asn/*":                      "ASN / BGP",
  "GET /api/economy/*":                  "Economic Indicators",
  "POST /api/image/generate":            "Image Generate",
  "POST /api/inference/complete":        "LLM Complete",
  "POST /api/inference/chat":            "LLM Chat",
  "GET /api/utils/*":                    "Utilities",
  "GET /api/summarize/*":                "Summarize URL",
  "POST /api/classify/*":                "Text Classify",
  "POST /api/entities/*":                "Entity Extract",
  "POST /api/mcp":                       "Universal MCP",
  "POST /api/credits/purchase/starter":  "Starter Bundle",
  "POST /api/credits/purchase/pro":      "Pro Bundle",
  "POST /api/credits/purchase/business": "Business Bundle",
};

// Routes with a matching SKILL.md — link to /skills/{slug} instead of /docs
const SKILL_MAP: Record<string, string> = {
  "GET /api/property/*":    "/skills/devdrops-property-intelligence",
  "GET /api/property/mcp/*": "/skills/devdrops-universal-mcp",
  "GET /api/predictions/*": "/skills/devdrops-prediction-markets",
  "GET /api/fx/*":          "/skills/devdrops-fx-rates",
  "GET /api/weather/*":     "/skills/devdrops-weather",
  "GET /api/regulatory/*":  "/skills/devdrops-regulatory-feeds",
  "GET /api/filings/*":     "/skills/devdrops-regulatory-feeds",
  "GET /api/research/*":    "/skills/devdrops-research-brief",
  "GET /api/extract/*":     "/skills/devdrops-document-summariser",
  "GET /api/summarize/*":   "/skills/devdrops-document-summariser",
  "GET /api/sanctions/*":   "/skills/devdrops-sanctions-screening",
  "GET /api/company/*":     "/skills/devdrops-company-enrichment",
  "POST /api/mcp":          "/skills/devdrops-universal-mcp",
};

function isFree(leafPath: string): boolean {
  return FREE_TIER_PREFIXES.some((p) => leafPath.startsWith(p));
}

function parsePrice(price: string): number {
  return parseFloat(price.replace("$", ""));
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Product = {
  name: string;
  endpoint: string;
  method: string;
  price: string;
  priceNum: number;
  tier: Tier;
  free: boolean;
  description: string;
  docsUrl: string;
  slug: string;
};

function buildProducts(): Product[] {
  const seen = new Set<string>();
  const products: Product[] = [];

  for (const [route, config] of Object.entries(pricingMap)) {
    const [method, path] = route.split(" ");
    const parts = path.replace("/*", "").split("/").slice(2);
    const slug = parts.join("-");

    if (seen.has(slug)) continue;
    seen.add(slug);

    const leafPath = manifestLeafPaths[route] ?? path.replace("/*", "");

    products.push({
      name: NAME_MAP[route] ?? slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      endpoint: leafPath,
      method,
      price: config.price,
      priceNum: parsePrice(config.price),
      tier: TIER_MAP[route] ?? "Utility",
      free: isFree(leafPath),
      description: config.description,
      docsUrl: SKILL_MAP[route] ?? "/docs",
      slug,
    });
  }

  return products;
}

export function buildCatalogJSON(network?: string) {
  const products = buildProducts();
  return {
    name: "DevDrops",
    description: "Pay-per-query data APIs powered by x402 micropayments",
    protocol: "x402",
    network,
    product_count: products.length,
    products: products.map((p) => ({
      endpoint: p.endpoint,
      method: p.method,
      price: p.price,
      description: p.description,
      slug: p.slug,
      tier: p.tier,
      free_tier: p.free,
    })),
  };
}

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 228 56" fill="none">
<defs><linearGradient id="dg" x1="22" y1="3" x2="22" y2="51" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs>
<path d="M22 3C11 14 5 22 5 34A17 17 0 0 0 39 34C39 22 33 14 22 3Z" fill="url(#dg)"/>
<ellipse cx="15" cy="31" rx="3.5" ry="5.5" fill="white" fill-opacity="0.28" transform="rotate(-18 15 31)"/>
<text x="52" y="39" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif" font-size="26" font-weight="800" letter-spacing="-0.5"><tspan fill="#6366f1">dev</tspan><tspan fill="#1e293b">drops</tspan></text>
</svg>`;

function renderHTML(network?: string): string {
  const products = buildProducts();

  const grouped = new Map<Tier, Product[]>();
  for (const tier of TIER_ORDER) {
    const tp = products
      .filter((p) => p.tier === tier)
      .sort((a, b) => a.priceNum - b.priceNum);
    if (tp.length > 0) grouped.set(tier, tp);
  }

  const totalCount = products.length;

  const sections = Array.from(grouped.entries())
    .map(([tier, prods]) => {
      const rows = prods
        .map((p) => {
          const freeBadge = p.free
            ? `<span class="badge-free">Free: ${FREE_QUERIES_PER_DAY}/day</span>`
            : "";
          const docsLabel = p.docsUrl.startsWith("/skills") ? "Skill&nbsp;→" : "Docs&nbsp;→";
          return `<tr>
<td class="col-name">${esc(p.name)}</td>
<td class="col-path"><code>${esc(p.endpoint)}</code></td>
<td class="col-price">${esc(p.price)}</td>
<td class="col-free">${freeBadge}</td>
<td class="col-desc">${esc(p.description)}</td>
<td class="col-docs"><a href="${esc(p.docsUrl)}">${docsLabel}</a></td>
</tr>`;
        })
        .join("\n");

      return `<tbody>
<tr class="tier-row"><td colspan="6">${esc(tier)}</td></tr>
${rows}
</tbody>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="refresh" content="60">
<title>DevDrops Catalog — ${totalCount} API Products</title>
<meta name="description" content="${totalCount} pay-per-query data API endpoints powered by x402 micropayments. No API keys, no subscriptions.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
--bg:#0a0a0b;--bg2:#111113;--bg3:#1a1a1e;
--text:#e8e6e1;--text2:#9d9b95;--text3:#5c5b57;
--accent:#22c55e;--accent2:#16a34a;--accent-dim:rgba(34,197,94,.08);
--border:#222224;--border2:#2a2a2e;
--mono:'JetBrains Mono',monospace;--serif:'Instrument Serif',Georgia,serif;
--radius:6px;
}
body{background:var(--bg);color:var(--text);font-family:var(--mono);font-size:14px;line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.container{max-width:960px;margin:0 auto;padding:0 24px}
header{padding:20px 0;border-bottom:1px solid var(--border)}
.header-inner{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.logo{display:flex;align-items:center;text-decoration:none}
.logo svg{height:28px;width:auto}
.header-links{display:flex;gap:16px;align-items:center}
.header-links a{font-size:12px;color:var(--text3)}
.header-links a:hover{color:var(--text)}
.header-tag{font-size:11px;color:var(--text3);border:1px solid var(--border);padding:3px 10px;border-radius:20px}
.hero{padding:60px 0 40px;border-bottom:1px solid var(--border)}
.hero h1{font-family:var(--serif);font-size:clamp(32px,5vw,52px);font-weight:400;line-height:1.1;margin-bottom:12px}
.hero-sub{font-size:13px;color:var(--text2);max-width:560px;line-height:1.7}
.hero-meta{font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1.5px;margin-top:16px}
.catalog-wrap{margin:40px 0 60px}
table{width:100%;border-collapse:collapse}
thead th{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:1.5px;padding:8px 12px;border-bottom:2px solid var(--border2);text-align:left;white-space:nowrap}
.tier-row td{font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:2px;padding:24px 12px 6px;background:var(--bg)}
tbody:first-of-type .tier-row td{padding-top:12px}
tr:not(.tier-row){border-bottom:1px solid var(--border)}
tr:not(.tier-row):hover td{background:var(--bg2)}
td{padding:10px 12px;vertical-align:top}
.col-name{font-size:12px;font-weight:700;color:var(--text);min-width:130px;white-space:nowrap}
.col-path code{font-size:11px;color:var(--text2);background:var(--bg2);padding:2px 6px;border-radius:3px;word-break:break-all}
.col-price{font-size:12px;color:var(--accent);white-space:nowrap}
.col-free{white-space:nowrap;min-width:80px}
.col-desc{font-size:11px;color:var(--text2);line-height:1.5}
.col-docs{font-size:11px;white-space:nowrap}
.badge-free{display:inline-block;font-size:10px;padding:2px 7px;border-radius:3px;background:var(--accent-dim);color:var(--accent);border:1px solid rgba(34,197,94,.15);white-space:nowrap}
footer{padding:24px 0;border-top:1px solid var(--border);font-size:11px;color:var(--text3)}
.footer-inner{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
@media(max-width:639px){
.hero{padding:40px 0 28px}
.header-tag{display:none}
table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}
.col-desc{min-width:160px}
.col-name{min-width:110px}
}
</style>
</head>
<body>
<header>
<div class="container header-inner">
<a class="logo" href="/">${LOGO_SVG}</a>
<div class="header-links">
<a href="/catalog">Catalog</a>
<a href="/buy" style="color:var(--accent);font-weight:700">Buy Credits</a>
<a href="/skills">Skills</a>
<a href="/openapi.json">OpenAPI</a>
<a href="/docs">Docs</a>
<a href="/health">Status</a>
</div>
<div class="header-tag">x402 · USDC on Base</div>
</div>
</header>

<section class="hero">
<div class="container">
<h1>DevDrops Catalog</h1>
<p class="hero-sub">Pay-per-query data APIs powered by x402 micropayments. No API keys, no subscriptions — send a request, pay USDC on Base, get data.</p>
<p class="hero-meta">${totalCount} products · ${network ?? "—"} · prices in USD · free tier: 8 endpoints, 5 req/day/IP</p>
</div>
</section>

<div class="container catalog-wrap">
<table>
<thead>
<tr>
<th class="col-name">Product</th>
<th class="col-path">Endpoint</th>
<th class="col-price">Price</th>
<th class="col-free">Free Tier</th>
<th class="col-desc">Description</th>
<th class="col-docs">Docs</th>
</tr>
</thead>
${sections}
</table>
</div>

<footer>
<div class="container footer-inner">
<span>Machine-readable: <a href="/catalog.json">/catalog.json</a> · x402 manifest: <a href="https://api.devdrops.run/.well-known/x402">/.well-known/x402</a></span>
<span><a href="/health" style="color:var(--text3)">API health JSON</a></span>
</div>
</footer>
</body>
</html>`;
}

catalog.get("/", (c) => {
  const accept = c.req.header("Accept") ?? "";
  if (accept.includes("text/html")) {
    return c.html(renderHTML(c.env.NETWORK));
  }
  return c.json(buildCatalogJSON(c.env.NETWORK));
});

export default catalog;
