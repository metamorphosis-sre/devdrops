import { Hono } from "hono";
import type { Env } from "../types";
import { pricingMap } from "../middleware/payment";

const catalog = new Hono<{ Bindings: Env }>();

catalog.get("/", (c) => {
  const products = Object.entries(pricingMap).map(([route, config]) => {
    const [method, path] = route.split(" ");
    const slug = path.split("/")[2]; // /api/predictions/* → predictions

    return {
      endpoint: path.replace("/*", ""),
      method,
      price: config.price,
      description: config.description,
      slug,
    };
  });

  // Deduplicate by slug (some products have GET + POST)
  const seen = new Set<string>();
  const unique = products.filter((p) => {
    if (seen.has(p.slug)) return false;
    seen.add(p.slug);
    return true;
  });

  return c.json({
    name: "DevDrops",
    description: "Pay-per-query data APIs powered by x402 micropayments",
    protocol: "x402",
    network: c.env.NETWORK,
    product_count: unique.length,
    products: unique,
  });
});

export default catalog;
