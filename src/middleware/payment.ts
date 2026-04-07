import type { PricingMap } from "../types";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

// Central pricing map for all DevDrops products.
// Add new product routes here — the x402 middleware reads this to set per-route prices.
// Prices are in USD (dollar-prefixed strings required by x402).
export const pricingMap: PricingMap = {
  // Tier 1: Domain Expertise
  "GET /api/property/*": { price: "$0.01", description: "Global property intelligence — planning, prices, zoning" },
  "GET /api/property/mcp/*": { price: "$0.01", description: "Property intelligence via MCP tools" },
  "POST /api/property/mcp": { price: "$0.01", description: "Property intelligence via MCP tools (JSON-RPC)" },

  // Tier 2: Data Aggregation
  "GET /api/predictions/*": { price: "$0.005", description: "Cross-platform prediction market odds" },
  "GET /api/odds/*": { price: "$0.005", description: "Cross-bookmaker sports betting odds" },
  "GET /api/regulatory/*": { price: "$0.01", description: "Regulatory change feeds — Companies House, SEC, FCA" },
  "GET /api/calendar/*": { price: "$0.005", description: "Financial events calendar — FOMC, earnings, IPOs" },
  "GET /api/filings/*": { price: "$0.01", description: "Company filings and beneficial ownership" },
  "GET /api/domain/*": { price: "$0.005", description: "WHOIS, DNS, SSL, tech stack detection" },
  "GET /api/weather/*": { price: "$0.001", description: "Current conditions, forecasts, severe weather alerts" },
  "GET /api/fx/*": { price: "$0.001", description: "Currency exchange rates — 33 major currencies" },
  "GET /api/ip/*": { price: "$0.001", description: "IP geolocation — country, city, ISP, proxy detection" },
  "GET /api/history/*": { price: "$0.001", description: "Historical events and 'on this day' data" },
  "GET /api/papers/*": { price: "$0.005", description: "Academic paper search — abstracts, citations, DOIs" },
  "GET /api/food/*": { price: "$0.005", description: "Nutrition data — calories, allergens, ingredients" },
  "GET /api/tenders/*": { price: "$0.01", description: "Public procurement and government tender notices" },

  // Tier 3: AI-Enhanced (higher prices to cover Claude API costs)
  "GET /api/sentiment/*": { price: "$0.02", description: "AI-powered news sentiment analysis" },
  "POST /api/sentiment/*": { price: "$0.02", description: "AI-powered news sentiment analysis" },
  "GET /api/signals/*": { price: "$0.05", description: "Cross-market correlation signals" },
  "POST /api/documents/*": { price: "$0.10", description: "Contract and document summarisation" },
  "GET /api/location/*": { price: "$0.02", description: "Address intelligence — flood, crime, schools, transport" },
  "GET /api/research/*": { price: "$0.10", description: "AI research brief generator" },
  "POST /api/research/*": { price: "$0.10", description: "AI research brief generator" },

  // Expansion products
  "POST /api/translate/*": { price: "$0.005", description: "Text translation — 70+ languages" },
  "GET /api/email-verify/*": { price: "$0.005", description: "Email address verification" },

  // New utility products
  "GET /api/qr/*": { price: "$0.001", description: "QR code generator — SVG, PNG, or base64 JSON" },
  "GET /api/crypto/*": { price: "$0.001", description: "Crypto token prices and market data via CoinCap" },
  "GET /api/time/*": { price: "$0.001", description: "Timezone conversion, public holidays, business day checks" },

  // New intelligence products
  "GET /api/vat/*": { price: "$0.01", description: "EU and UK VAT number verification via VIES and HMRC" },
  "GET /api/stocks/*": { price: "$0.005", description: "Live stock quotes, history, movers — 10,000+ tickers" },
  "GET /api/extract/*": { price: "$0.005", description: "URL content extraction — clean text, metadata, links" },
  "POST /api/extract/*": { price: "$0.005", description: "HTML content extraction from submitted markup" },
  "GET /api/sanctions/*": { price: "$0.05", description: "Sanctions screening — OFAC, UN, UK HMT lists with fuzzy matching" },
  "GET /api/company/*": { price: "$0.02", description: "Company enrichment — UK Companies House, officers, PSCs, charges" },
};

// Build the x402 routes config from the pricing map.
// Each route gets bazaar discovery extensions so it appears in CDP's Bazaar discovery index.
export function buildX402Routes(payTo: string, network: string) {
  const routes: Record<string, {
    accepts: { scheme: string; price: string; network: string; payTo: string };
    description: string;
    mimeType: string;
    extensions: Record<string, unknown>;
  }> = {};

  for (const [route, config] of Object.entries(pricingMap)) {
    const [method] = route.split(" ");
    const isPost = method === "POST";

    const extensions = isPost
      ? declareDiscoveryExtension({ bodyType: "json" })
      : declareDiscoveryExtension({});

    routes[route] = {
      accepts: {
        scheme: "exact",
        price: config.price,
        network,
        payTo,
      },
      description: config.description,
      mimeType: "application/json",
      extensions,
    };
  }

  return routes;
}
