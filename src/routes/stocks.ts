import { Hono } from "hono";
import type { Env } from "../types";
import { getTiered, setTiered } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "stocks";
const CACHE_TTL = 300; // 5 minutes (prices change constantly)

const stocks = new Hono<{ Bindings: Env }>();

// GET /api/stocks/quote/:ticker — current price and key metrics
stocks.get("/quote/:ticker", async (c) => {
  const ticker = c.req.param("ticker").toUpperCase();
  const cacheKey = `quote:${ticker}`;

  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const data = await fetchQuote(ticker);
  if (!data) return c.json({ error: `Ticker not found: ${ticker}` }, 404);

  await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/stocks/search?q=apple — search for tickers by name
stocks.get("/search", async (c) => {
  const q = c.req.query("q");
  if (!q) return c.json({ error: "Missing 'q' query param" }, 400);

  const cacheKey = `search:${q}`;
  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const data = await searchTickers(q);
  await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, 3600);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/stocks/movers — top gainers and losers
stocks.get("/movers", async (c) => {
  const cacheKey = "movers";
  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const data = await fetchMovers();
  await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/stocks/history/:ticker?period=1mo — historical prices
stocks.get("/history/:ticker", async (c) => {
  const ticker = c.req.param("ticker").toUpperCase();
  const period = c.req.query("period") ?? "1mo"; // 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y
  const cacheKey = `history:${ticker}:${period}`;

  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const data = await fetchHistory(ticker, period);
  if (!data) return c.json({ error: `No history found for: ${ticker}` }, 404);

  await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, 3600);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

stocks.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: [
    "/api/stocks/quote/AAPL",
    "/api/stocks/quote/TSLA",
    "/api/stocks/search?q=apple",
    "/api/stocks/movers",
    "/api/stocks/history/AAPL?period=1mo",
  ],
  disclaimer: "Not financial advice. Data from public sources, may be delayed.",
}, 400));

// Yahoo Finance v8 — unofficial but widely used, no key required
async function fetchQuote(ticker: string): Promise<Record<string, unknown> | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const raw: any = await res.json();

    const meta = raw.chart?.result?.[0]?.meta;
    if (!meta) return null;

    return {
      ticker: meta.symbol,
      exchange: meta.exchangeName,
      currency: meta.currency,
      price: meta.regularMarketPrice,
      previous_close: meta.previousClose ?? meta.chartPreviousClose,
      open: meta.regularMarketOpen,
      day_high: meta.regularMarketDayHigh,
      day_low: meta.regularMarketDayLow,
      volume: meta.regularMarketVolume,
      market_cap: meta.marketCap ?? null,
      fifty_two_week_high: meta.fiftyTwoWeekHigh ?? null,
      fifty_two_week_low: meta.fiftyTwoWeekLow ?? null,
      change: meta.regularMarketPrice - (meta.previousClose ?? meta.chartPreviousClose),
      change_pct: ((meta.regularMarketPrice - (meta.previousClose ?? meta.chartPreviousClose)) / (meta.previousClose ?? meta.chartPreviousClose) * 100),
      market_state: meta.marketState,
      timezone: meta.timezone,
      source: "Yahoo Finance",
      disclaimer: "Not financial advice. Data may be delayed.",
    };
  } catch {
    return null;
  }
}

async function searchTickers(query: string): Promise<Record<string, unknown>[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const raw: any = await res.json();

    return (raw.quotes ?? []).slice(0, 10).map((q: any) => ({
      ticker: q.symbol,
      name: q.longname ?? q.shortname,
      exchange: q.exchange,
      type: q.quoteType,
    }));
  } catch {
    return [];
  }
}

async function fetchMovers(): Promise<Record<string, unknown>> {
  try {
    // Yahoo Finance screeners for gainers/losers
    const [gainers, losers] = await Promise.allSettled([
      fetchScreener("day_gainers"),
      fetchScreener("day_losers"),
    ]);

    return {
      gainers: gainers.status === "fulfilled" ? gainers.value : [],
      losers: losers.status === "fulfilled" ? losers.value : [],
      disclaimer: "Not financial advice.",
    };
  } catch {
    return { gainers: [], losers: [], error: "Data unavailable" };
  }
}

async function fetchScreener(type: string): Promise<Record<string, unknown>[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=${type}&count=10`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];
  const raw: any = await res.json();
  const quotes = raw.finance?.result?.[0]?.quotes ?? [];
  return quotes.map((q: any) => ({
    ticker: q.symbol,
    name: q.shortName,
    price: q.regularMarketPrice,
    change_pct: q.regularMarketChangePercent,
    volume: q.regularMarketVolume,
  }));
}

async function fetchHistory(ticker: string, period: string): Promise<Record<string, unknown> | null> {
  try {
    const intervalMap: Record<string, string> = {
      "1d": "5m", "5d": "15m", "1mo": "1d", "3mo": "1d",
      "6mo": "1wk", "1y": "1wk", "2y": "1mo", "5y": "1mo",
    };
    const interval = intervalMap[period] ?? "1d";
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${period}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const raw: any = await res.json();

    const result = raw.chart?.result?.[0];
    if (!result) return null;

    const timestamps: number[] = result.timestamp ?? [];
    const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];
    const volumes: number[] = result.indicators?.quote?.[0]?.volume ?? [];

    return {
      ticker,
      period,
      interval,
      currency: result.meta?.currency,
      candles: timestamps.map((t, i) => ({
        time: new Date(t * 1000).toISOString(),
        close: closes[i] ?? null,
        volume: volumes[i] ?? null,
      })).filter((c) => c.close !== null),
      disclaimer: "Not financial advice.",
    };
  } catch {
    return null;
  }
}

export default stocks;
