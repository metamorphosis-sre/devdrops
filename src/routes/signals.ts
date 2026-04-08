import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { missingKeyResponse } from "../lib/fetch";

const PRODUCT = "signals";
const CACHE_TTL = 900; // 15 minutes

const signals = new Hono<{ Bindings: Env }>();

// GET /api/signals/correlate?market=us-election
signals.get("/correlate", async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) return c.json(missingKeyResponse("ANTHROPIC_API_KEY"), 503);

  const market = c.req.query("market");
  if (!market) return c.json({ error: "Missing 'market' query param" }, 400);

  const cacheKey = `correlate:${market}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  // Pull data from internal product endpoints (stored in D1 cache)
  const [predictions, newsData, calendarData] = await Promise.allSettled([
    getFromCache(c.env.DB, "predictions", `search:${market}`),
    getFromCache(c.env.DB, "sentiment", `analyze:${market}`),
    getFromCache(c.env.DB, "calendar", "upcoming:7"),
  ]);

  const context = {
    predictions: predictions.status === "fulfilled" ? predictions.value : null,
    sentiment: newsData.status === "fulfilled" ? newsData.value : null,
    calendar: calendarData.status === "fulfilled" ? calendarData.value : null,
  };

  // Cross-correlate with Claude
  const analysis = await correlateWithClaude(market, context, c.env.ANTHROPIC_API_KEY);

  const data = {
    market,
    sources_available: {
      predictions: !!context.predictions,
      sentiment: !!context.sentiment,
      calendar: !!context.calendar,
    },
    correlation: analysis,
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

async function getFromCache(db: D1Database, product: string, cacheKey: string) {
  const row = await db.prepare(
    `SELECT data_json FROM product_cache WHERE product = ? AND cache_key = ? AND expires_at > datetime('now')`
  ).bind(product, cacheKey).first<{ data_json: string }>();
  return row ? JSON.parse(row.data_json) : null;
}

async function correlateWithClaude(market: string, context: any, apiKey: string) {
  const contextStr = JSON.stringify(context, null, 2).substring(0, 10000);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [{ role: "user", content: `Analyze cross-market signals for "${market}". Available data:\n${contextStr}\n\nReturn JSON with: signal_strength (0-1), direction (bullish/bearish/neutral), confidence (0-1), key_drivers (array of strings), correlations_found (array of {factor_a, factor_b, relationship}), risk_factors (array of strings), recommendation (string).` }],
        system: "You are a quantitative market analyst. Identify correlations between prediction markets, news sentiment, and financial events. Always respond with valid JSON only. Be conservative in signal strength estimates.",
      }),
    });
    const raw: any = await res.json();
    return JSON.parse(raw.content?.[0]?.text ?? "{}");
  } catch (e) {
    return { error: "Correlation analysis failed" };
  }
}

signals.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: ["/api/signals/correlate?market=us-election"],
}, 400));

export default signals;
