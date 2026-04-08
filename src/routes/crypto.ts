import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "crypto";
const CACHE_TTL = 60; // 1 minute (prices change constantly)

const crypto = new Hono<{ Bindings: Env }>();

// GET /api/crypto/price/:symbol — current price for a token (e.g. BTC, ETH, SOL)
crypto.get("/price/:symbol", async (c) => {
  const symbol = c.req.param("symbol").toUpperCase();
  const cacheKey = `price:${symbol}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const data = await fetchCoinCapPrice(symbol);

  if (!data) return c.json({ error: `Token not found: ${symbol}`, hint: "Use the symbol (e.g. BTC, ETH, SOL)" }, 404);

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/crypto/top?limit=20 — top tokens by market cap
crypto.get("/top", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") ?? "20"), 100);
  const cacheKey = `top:${limit}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  // Try CoinCap first, fall back to CoinGecko
  try {
    const res = await fetchUpstream(`https://api.coincap.io/v2/assets?limit=${limit}`);
    const raw: any = await res.json();
    if (raw.data?.length) {
      const data = raw.data.map((a: any) => ({
        rank: parseInt(a.rank),
        symbol: a.symbol,
        name: a.name,
        price_usd: parseFloat(a.priceUsd),
        change_24h_pct: parseFloat(a.changePercent24Hr),
        market_cap_usd: parseFloat(a.marketCapUsd),
        volume_24h_usd: parseFloat(a.volumeUsd24Hr),
        supply: parseFloat(a.supply),
        max_supply: a.maxSupply ? parseFloat(a.maxSupply) : null,
        source: "CoinCap",
      }));
      await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
      return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
    }
  } catch { /* fall through to CoinGecko */ }

  try {
    const res = await fetchUpstream(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`
    );
    const raw: any = await res.json();
    const data = raw.map((a: any, i: number) => ({
      rank: i + 1,
      symbol: a.symbol?.toUpperCase(),
      name: a.name,
      price_usd: a.current_price,
      change_24h_pct: a.price_change_percentage_24h,
      market_cap_usd: a.market_cap,
      volume_24h_usd: a.total_volume,
      supply: a.circulating_supply,
      max_supply: a.max_supply ?? null,
      source: "CoinGecko",
    }));
    await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "Crypto data unavailable" }, 503);
  }
});

// GET /api/crypto/markets/:symbol — exchange markets for a token
crypto.get("/markets/:symbol", async (c) => {
  const symbol = c.req.param("symbol").toUpperCase();
  const cacheKey = `markets:${symbol}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  try {
    // First resolve symbol to asset ID
    const searchRes = await fetchUpstream(`https://api.coincap.io/v2/assets?search=${symbol}&limit=1`);
    const searchRaw: any = await searchRes.json();
    const assetId = searchRaw.data?.[0]?.id;

    if (!assetId) return c.json({ error: `Token not found: ${symbol}` }, 404);

    const res = await fetchUpstream(`https://api.coincap.io/v2/assets/${assetId}/markets?limit=10`);
    const raw: any = await res.json();

    const data = {
      symbol,
      asset_id: assetId,
      markets: raw.data?.map((m: any) => ({
        exchange: m.exchangeId,
        base: m.baseSymbol,
        quote: m.quoteSymbol,
        price_usd: parseFloat(m.priceUsd),
        volume_usd_24h: parseFloat(m.volumeUsd24Hr),
        percent_of_volume: parseFloat(m.percentExchangeVolume),
      })),
    };

    await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL * 5);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "CoinCap service unavailable" }, 503);
  }
});

// GET /api/crypto/history/:symbol?interval=d1 — historical OHLCV data
crypto.get("/history/:symbol", async (c) => {
  const symbol = c.req.param("symbol").toUpperCase();
  const interval = c.req.query("interval") ?? "d1"; // m1, m5, m15, m30, h1, h2, h6, h12, d1
  const cacheKey = `history:${symbol}:${interval}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  try {
    const searchRes = await fetchUpstream(`https://api.coincap.io/v2/assets?search=${symbol}&limit=1`);
    const searchRaw: any = await searchRes.json();
    const assetId = searchRaw.data?.[0]?.id;

    if (!assetId) return c.json({ error: `Token not found: ${symbol}` }, 404);

    const end = Date.now();
    const start = end - 30 * 24 * 60 * 60 * 1000; // 30 days
    const res = await fetchUpstream(`https://api.coincap.io/v2/assets/${assetId}/history?interval=${interval}&start=${start}&end=${end}`);
    const raw: any = await res.json();

    const data = {
      symbol,
      asset_id: assetId,
      interval,
      candles: raw.data?.map((p: any) => ({
        time: new Date(p.time).toISOString(),
        price_usd: parseFloat(p.priceUsd),
      })),
    };

    await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL * 30);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "CoinCap service unavailable" }, 503);
  }
});

crypto.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: [
    "/api/crypto/price/BTC",
    "/api/crypto/price/ETH",
    "/api/crypto/top?limit=20",
    "/api/crypto/markets/BTC",
    "/api/crypto/history/BTC?interval=d1",
  ],
}, 400));

async function fetchCoinCapPrice(symbol: string) {
  // Try CoinCap first
  try {
    const searchRes = await fetchUpstream(`https://api.coincap.io/v2/assets?search=${symbol}&limit=5`);
    const searchRaw: any = await searchRes.json();
    const asset = searchRaw.data?.find((a: any) => a.symbol.toUpperCase() === symbol);
    if (asset) {
      return {
        symbol: asset.symbol,
        name: asset.name,
        rank: parseInt(asset.rank),
        price_usd: parseFloat(asset.priceUsd),
        change_24h_pct: parseFloat(asset.changePercent24Hr),
        market_cap_usd: parseFloat(asset.marketCapUsd),
        volume_24h_usd: parseFloat(asset.volumeUsd24Hr),
        supply: parseFloat(asset.supply),
        max_supply: asset.maxSupply ? parseFloat(asset.maxSupply) : null,
        source: "CoinCap",
      };
    }
  } catch { /* fall through */ }

  // Fall back to CoinGecko
  try {
    const id = symbol.toLowerCase();
    const res = await fetchUpstream(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${id}&order=market_cap_desc&per_page=1&page=1`
    );
    const raw: any = await res.json();
    // CoinGecko uses name-based IDs (e.g. "bitcoin" not "BTC") — try by symbol if ID lookup fails
    let asset = raw?.[0];
    if (!asset) {
      const listRes = await fetchUpstream(`https://api.coingecko.com/api/v3/coins/list`);
      const list: any[] = await listRes.json();
      const match = list.find((c: any) => c.symbol.toUpperCase() === symbol);
      if (match) {
        const r2 = await fetchUpstream(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${match.id}&per_page=1&page=1`);
        const raw2: any = await r2.json();
        asset = raw2?.[0];
      }
    }
    if (!asset) return null;
    return {
      symbol: asset.symbol?.toUpperCase(),
      name: asset.name,
      rank: asset.market_cap_rank ?? null,
      price_usd: asset.current_price,
      change_24h_pct: asset.price_change_percentage_24h,
      market_cap_usd: asset.market_cap,
      volume_24h_usd: asset.total_volume,
      supply: asset.circulating_supply,
      max_supply: asset.max_supply ?? null,
      source: "CoinGecko",
    };
  } catch {
    return null;
  }
}

export default crypto;
