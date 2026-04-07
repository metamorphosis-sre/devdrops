import { Hono } from "hono";
import type { Env } from "../types";
import { BUNDLES, type BundleName, addCredits, getBalance, deductCredits, getTransactions } from "../lib/credits";

const PRODUCT = "credits";

const credits = new Hono<{ Bindings: Env }>();

// POST /api/credits/purchase/starter — buy $5 starter bundle
// POST /api/credits/purchase/pro — buy $25 pro bundle
// POST /api/credits/purchase/business — buy $100 business bundle
credits.post("/purchase/:bundle", async (c) => {
  const bundleName = c.req.param("bundle") as BundleName;
  if (!BUNDLES[bundleName]) {
    return c.json({ error: "Invalid bundle", valid: Object.keys(BUNDLES) }, 400);
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Request body must be JSON with { wallet: '0x...' }" }, 400);
  }

  const wallet = body?.wallet;
  if (!wallet || typeof wallet !== "string" || !wallet.startsWith("0x")) {
    return c.json({ error: "Missing or invalid 'wallet' address (must start with 0x)" }, 400);
  }

  try {
    const bundle = BUNDLES[bundleName];
    const balance = await addCredits(c.env.DB, wallet, bundleName);

    return c.json({
      product: PRODUCT,
      action: "purchase",
      bundle: {
        name: bundleName,
        label: bundle.label,
        price_usd: bundle.price,
        credits_added: bundle.credits,
        estimated_queries: bundle.queries,
        bonus: bundle.bonus,
      },
      balance,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return c.json({ error: "Failed to process credit purchase", detail: String(e) }, 503);
  }
});

// GET /api/credits/balance?wallet=0x... — check credit balance
credits.get("/balance", async (c) => {
  const wallet = c.req.query("wallet");
  if (!wallet || !wallet.startsWith("0x")) {
    return c.json({ error: "Missing 'wallet' query param (0x...)" }, 400);
  }

  try {
    const balance = await getBalance(c.env.DB, wallet);
    const transactions = await getTransactions(c.env.DB, wallet);

    return c.json({
      product: PRODUCT,
      data: { ...balance, recent_transactions: transactions },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return c.json({ error: "Failed to fetch balance", detail: String(e) }, 503);
  }
});

// POST /api/credits/use — internal: deduct credits (called by middleware)
credits.post("/use", async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Request body must be JSON" }, 400);
  }

  const { wallet, amount, endpoint } = body ?? {};
  if (!wallet || typeof amount !== "number" || !endpoint) {
    return c.json({ error: "Missing wallet, amount, or endpoint" }, 400);
  }

  try {
    const result = await deductCredits(c.env.DB, wallet, amount, endpoint);
    return c.json({ product: PRODUCT, action: "deduct", ...result });
  } catch (e: any) {
    if (e?.message === "Insufficient credits") {
      return c.json({ error: "Insufficient credits", wallet }, 402);
    }
    return c.json({ error: "Failed to deduct credits", detail: String(e) }, 503);
  }
});

credits.get("/", (c) => c.json({
  product: PRODUCT,
  description: "Prepaid credit bundles — buy once, query many. Saves on per-transaction gas fees.",
  bundles: Object.entries(BUNDLES).map(([name, b]) => ({
    name,
    label: b.label,
    price_usd: `$${b.price}`,
    credits: `$${b.credits.toFixed(2)}`,
    estimated_queries: b.queries,
    bonus: b.bonus,
  })),
  examples: [
    "POST /api/credits/purchase/starter { wallet: '0x...' }",
    "POST /api/credits/purchase/pro { wallet: '0x...' }",
    "GET /api/credits/balance?wallet=0x...",
  ],
}));

export default credits;
