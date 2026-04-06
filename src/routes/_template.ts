/**
 * PRODUCT ROUTE TEMPLATE
 *
 * Copy this file to create a new product endpoint.
 *
 * Steps to add a new product:
 * 1. Copy this file to src/routes/<product-name>.ts
 * 2. Add the route's pricing to src/middleware/payment.ts pricingMap
 * 3. Mount the router in src/index.ts: app.route("/api/<product-name>", productRouter)
 * 4. Add upstream data sources to the data_sources table
 */

import { Hono } from "hono";
import type { Env } from "../types";

const product = new Hono<{ Bindings: Env }>();

// Cache TTL in seconds
const CACHE_TTL = 300; // 5 minutes

product.get("/:query", async (c) => {
  const query = c.req.param("query");

  // 1. Check D1 cache first
  const cached = await c.env.DB.prepare(
    `SELECT data_json FROM product_cache
     WHERE product = ? AND cache_key = ? AND expires_at > datetime('now')`
  )
    .bind("product-name", query)
    .first<{ data_json: string }>();

  if (cached) {
    return c.json(JSON.parse(cached.data_json));
  }

  // 2. Fetch from upstream data source
  // Replace this with actual data source fetch logic
  const data = await fetchUpstream(query);

  // 3. Cache the result
  const expiresAt = new Date(Date.now() + CACHE_TTL * 1000).toISOString();
  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO product_cache (product, cache_key, data_json, expires_at)
     VALUES (?, ?, ?, ?)`
  )
    .bind("product-name", query, JSON.stringify(data), expiresAt)
    .run();

  // 4. Return structured JSON
  return c.json({
    product: "product-name",
    query,
    data,
    cached: false,
    timestamp: new Date().toISOString(),
  });
});

async function fetchUpstream(query: string): Promise<unknown> {
  // TODO: Replace with actual upstream API call
  // Example:
  // const res = await fetch(`https://api.example.com/data?q=${encodeURIComponent(query)}`);
  // if (!res.ok) throw new Error(`Upstream error: ${res.status}`);
  // return res.json();
  return { placeholder: true, query };
}

export default product;
