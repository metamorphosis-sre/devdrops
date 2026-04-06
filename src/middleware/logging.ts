import { createMiddleware } from "hono/factory";
import type { Env } from "../types";
import { pricingMap } from "./payment";

// Logs paid transactions and abandoned 402s to D1.
// Applied after x402 middleware so we can inspect the response status.
export const transactionLogger = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const start = Date.now();
  const endpoint = `${c.req.method} ${c.req.path}`;

  await next();

  const elapsed = Date.now() - start;
  const product = extractProduct(c.req.path);

  if (!product) return;

  try {
    if (c.res.status === 200 && c.req.path.startsWith("/api/")) {
      // Successful paid request — log transaction
      await c.env.DB.prepare(
        `INSERT INTO transactions (product, amount_usd, payment_method, agent_wallet, endpoint, response_time_ms)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          product,
          extractPrice(c),
          "x402",
          c.req.header("x-payer-address") ?? "unknown",
          endpoint,
          elapsed
        )
        .run();
    } else if (c.res.status === 402) {
      // Agent got the price but didn't pay — log abandonment
      await c.env.DB.prepare(
        `INSERT INTO abandoned_402s (product, price_shown, agent_info, endpoint)
         VALUES (?, ?, ?, ?)`
      )
        .bind(
          product,
          extractPrice(c),
          c.req.header("user-agent") ?? "unknown",
          endpoint
        )
        .run();
    }
  } catch (e) {
    // Don't let logging failures break the response
    console.error("Transaction logging error:", e);
  }
});

function extractProduct(path: string): string | null {
  // /api/predictions/us-election → "predictions"
  const parts = path.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[0] === "api") {
    return parts[1];
  }
  return null;
}

function extractPrice(c: { req: { method: string; path: string } }): string {
  const key = `${c.req.method} ${c.req.path.replace(/\/[^/]+$/, "/*")}`;
  return pricingMap[key]?.price ?? pricingMap[`${c.req.method} /api/${c.req.path.split("/")[2]}/*`]?.price ?? "unknown";
}
