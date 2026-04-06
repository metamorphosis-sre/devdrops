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

export default wellKnown;
