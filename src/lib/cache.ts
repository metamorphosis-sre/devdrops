// Reusable D1 cache helpers for all product routes

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
