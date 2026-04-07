// Endpoints eligible for free tier (5 queries/IP/day, no payment required)
// These are the best "try before you buy" endpoints — useful enough to hook developers
// without giving away premium products.
// Logic is inlined in src/index.ts payment middleware to avoid Hono cross-middleware
// context variable issues (c.set/c.get unreliable without a declared Variables type).
export const FREE_TIER_PREFIXES = [
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

export const FREE_QUERIES_PER_DAY = 5;
export const FREE_TIER_KV_TTL = 86400; // 24 hours
