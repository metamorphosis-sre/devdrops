import type { Context, Next } from "hono";
import type { Env } from "../types";

// Endpoints eligible for free tier (5 queries/IP/day, no payment required)
// These are the best "try before you buy" endpoints — useful enough to hook developers
// without giving away premium products.
const FREE_TIER_PREFIXES = [
  "/api/fx/",
  "/api/fx/latest",
  "/api/crypto/",
  "/api/time/",
  "/api/weather/",
  "/api/ip/",
  "/api/utils/",
  "/api/qr/",
  "/api/history/",
];

const FREE_QUERIES_PER_DAY = 5;
const FREE_TIER_KV_TTL = 86400; // 24 hours

function isFreeTierEligible(path: string): boolean {
  return FREE_TIER_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function getDateKey(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function getClientIP(c: Context): string {
  // Cloudflare sets CF-Connecting-IP; fall back to X-Forwarded-For
  return (
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function freeTierMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  // Only applies to GET requests on eligible endpoints
  if (c.req.method !== "GET" || !isFreeTierEligible(c.req.path)) {
    return next();
  }

  const ip = getClientIP(c);
  if (ip === "unknown") return next();

  const kvKey = `freetier:${ip}:${getDateKey()}`;

  try {
    const raw = await c.env.CACHE.get(kvKey);
    const used = raw ? parseInt(raw) : 0;

    if (used < FREE_QUERIES_PER_DAY) {
      // Under limit — serve free, increment counter, skip payment
      c.set("freeTierUsed" as any, true);

      // Increment after the response is sent
      const newCount = used + 1;
      // Don't await — fire and forget so it doesn't add latency
      c.env.CACHE.put(kvKey, String(newCount), { expirationTtl: FREE_TIER_KV_TTL });

      // Add free tier headers so developers can see their quota
      const remaining = FREE_QUERIES_PER_DAY - newCount;
      c.header("X-Free-Tier-Remaining", String(remaining));
      c.header("X-Free-Tier-Limit", String(FREE_QUERIES_PER_DAY));
      c.header("X-Free-Tier-Reset", "daily at midnight UTC");
      c.header("X-Upgrade", "Pay per query with x402 — https://devdrops.run");

      return next();
    }
  } catch {
    // KV failure — fall through to payment middleware, don't block
    return next();
  }

  // Over free limit — fall through to x402 payment middleware
  return next();
}
