import { Hono } from "hono";
import type { Env } from "../types";
import { pricingMap } from "../middleware/payment";

const wellKnown = new Hono<{ Bindings: Env }>();

// GET /.well-known/x402
// Machine-readable service manifest for AI agent discovery.
// Follows de facto x402 ecosystem conventions (not yet formally standardised).
wellKnown.get("/x402", (c) => {
  const baseUrl = "https://api.devdrops.run";

  // Build endpoint list from the live pricing map
  const endpoints = Object.entries(pricingMap).map(([route, config]) => {
    const [method, path] = route.split(" ");
    return {
      path: path.replace("/*", ""),
      methods: [method],
      price: config.price.replace("$", ""),
      currency: "USDC",
      description: config.description,
    };
  });

  const manifest = {
    version: "x402/1",
    name: "DevDrops",
    description:
      "22 pay-per-query data APIs for AI agents — prediction markets, property intelligence, " +
      "sports odds, regulatory filings, FX rates, weather, IP geolocation, academic papers, " +
      "AI document summarisation, and more. No API keys or subscriptions.",
    baseUrl,
    wallet: c.env.PAY_TO_ADDRESS,
    pricing: {
      currency: "USDC",
      network: "base",
      network_id: "eip155:8453",
      min: "0.001",
      max: "0.10",
    },
    endpoints,
    links: {
      catalog: `${baseUrl}/catalog`,
      openapi: `${baseUrl}/openapi.json`,
      health: `${baseUrl}/health`,
      landing: "https://devdrops.run",
    },
    tags: [
      "prediction-markets",
      "property",
      "finance",
      "regulatory",
      "weather",
      "fx",
      "geolocation",
      "ai",
      "research",
    ],
  };

  return c.json(manifest, 200, {
    "Cache-Control": "public, max-age=3600",
  });
});

// GET /.well-known/mcp.json — MCP server discovery manifest
wellKnown.get("/mcp.json", (c) => {
  return c.json({
    schema_version: "v1",
    name_for_human: "DevDrops Property",
    name_for_model: "devdrops_property",
    description_for_human: "UK property price lookups, company charges, and House Price Index via MCP.",
    description_for_model: "Query UK property transaction prices by postcode, look up property charges registered against a company, and retrieve the UK House Price Index by region. All data is sourced from HM Land Registry and Companies House. Prices are paid in USDC via x402.",
    auth: { type: "none" },
    payment: {
      type: "x402",
      network: "base",
      currency: "USDC",
      price_per_call: "0.01",
      facilitator: "https://api.cdp.coinbase.com/platform/v2/x402",
    },
    api: {
      type: "mcp",
      url: "https://api.devdrops.run/api/property/mcp",
      transport: "streamable-http",
      protocol_version: "2024-11-05",
    },
    tools: [
      {
        name: "get_uk_property_prices",
        description: "Recent UK property sale prices by postcode from HM Land Registry.",
      },
      {
        name: "get_uk_company_property_charges",
        description: "Property charges (mortgages) registered against a UK company number.",
      },
      {
        name: "get_uk_house_price_index",
        description: "UK House Price Index — average prices and annual/monthly changes by region.",
      },
    ],
  }, 200, { "Cache-Control": "public, max-age=86400" });
});

export default wellKnown;
