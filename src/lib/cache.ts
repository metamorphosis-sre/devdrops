// Cache helpers — KV (fast, edge) + D1 (persistent, fallback)
// Read order: KV → D1 → upstream
// Write order: upstream → D1 → KV

// ── D1 cache ──────────────────────────────────────────────────────────────────

export async function getCached(db: D1Database, product: string, cacheKey: string): Promise<unknown | null> {
  const row = await db.prepare(
    `SELECT data_json FROM product_cache
     WHERE product = ? AND cache_key = ? AND expires_at > datetime('now')`
  )
    .bind(product, cacheKey)
    .first<{ data_json: string }>();

  return row ? JSON.parse(row.data_json) : null;
}

export async function setCache(db: D1Database, product: string, cacheKey: string, data: unknown, ttlSeconds: number) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await db.prepare(
    `INSERT OR REPLACE INTO product_cache (product, cache_key, data_json, expires_at)
     VALUES (?, ?, ?, ?)`
  )
    .bind(product, cacheKey, JSON.stringify(data), expiresAt)
    .run();
}

// ── KV cache (~1ms at edge) ───────────────────────────────────────────────────

export async function getKV(cache: KVNamespace, key: string): Promise<unknown | null> {
  return cache.get(key, "json");
}

export async function setKV(cache: KVNamespace, key: string, data: unknown, ttlSeconds: number) {
  await cache.put(key, JSON.stringify(data), { expirationTtl: ttlSeconds });
}

// ── Two-tier helper: KV → D1 (read), D1 + KV (write) ─────────────────────────

export async function getTiered(
  cache: KVNamespace,
  db: D1Database,
  product: string,
  cacheKey: string,
): Promise<unknown | null> {
  // 1. Try KV first (~1ms)
  const kvData = await getKV(cache, `${product}:${cacheKey}`);
  if (kvData !== null) return kvData;

  // 2. Fall back to D1 (~50ms)
  const d1Data = await getCached(db, product, cacheKey);
  if (d1Data !== null) {
    // Warm KV from D1 hit — fire and forget, don't block response
    // Use 5 min TTL so KV stays fresh relative to D1
    cache.put(`${product}:${cacheKey}`, JSON.stringify(d1Data), { expirationTtl: 300 }).catch(() => {});
    return d1Data;
  }

  return null;
}

export async function setTiered(
  cache: KVNamespace,
  db: D1Database,
  product: string,
  cacheKey: string,
  data: unknown,
  ttlSeconds: number,
) {
  // Write to both layers in parallel
  await Promise.all([
    setCache(db, product, cacheKey, data, ttlSeconds),
    setKV(cache, `${product}:${cacheKey}`, data, Math.min(ttlSeconds, 3600)),
  ]);
}
