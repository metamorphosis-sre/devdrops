import { Hono } from "hono";
import type { Env } from "../types";
import { getTiered, setTiered } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "fx";
const CACHE_TTL = 3600; // 1 hour (ECB rates update daily)
const BASE_URL = "https://api.frankfurter.dev/v1";

const fx = new Hono<{ Bindings: Env }>();

// GET /api/fx/latest — latest rates (base EUR by default)
fx.get("/latest", async (c) => {
  const base = c.req.query("base") ?? "EUR";
  const symbols = c.req.query("symbols");
  const cacheKey = `latest:${base}:${symbols ?? "all"}`;

  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  let url = `${BASE_URL}/latest?base=${base}`;
  if (symbols) url += `&symbols=${symbols}`;

  const res = await fetchUpstream(url);
  const data = await res.json();

  await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/fx/convert?from=USD&to=GBP&amount=100
fx.get("/convert", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  const amount = c.req.query("amount") ?? "1";

  if (!from || !to) return c.json({ error: "Missing 'from' and 'to' query params" }, 400);

  const url = `${BASE_URL}/latest?base=${from}&symbols=${to}`;
  const res = await fetchUpstream(url);
  const data: any = await res.json();
  const rate = data.rates?.[to];

  return c.json({
    product: PRODUCT,
    from,
    to,
    amount: parseFloat(amount),
    rate,
    result: rate ? parseFloat(amount) * rate : null,
    date: data.date,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/fx/currencies — list available currencies
fx.get("/currencies", async (c) => {
  const cacheKey = "currencies";
  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const res = await fetchUpstream(`${BASE_URL}/currencies`);
  const data = await res.json();

  await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, 86400); // 24h cache
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/fx/historical?date=2026-01-15&base=USD
fx.get("/historical", async (c) => {
  const date = c.req.query("date");
  const base = c.req.query("base") ?? "EUR";
  if (!date) return c.json({ error: "Missing 'date' query param (YYYY-MM-DD)" }, 400);

  const cacheKey = `hist:${date}:${base}`;
  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const res = await fetchUpstream(`${BASE_URL}/${date}?base=${base}`);
  const data = await res.json();

  await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, 86400);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

fx.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: ["/api/fx/latest", "/api/fx/convert?from=USD&to=GBP&amount=100", "/api/fx/currencies", "/api/fx/historical?date=2026-01-15"],
}, 400));

export default fx;
