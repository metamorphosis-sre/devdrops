import { beforeAll } from "vitest";
import { env } from "cloudflare:test";

// Apply the D1 schema so product_cache, transactions, etc. exist for tests
beforeAll(async () => {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      product TEXT NOT NULL,
      amount_usd TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      agent_wallet TEXT,
      endpoint TEXT NOT NULL,
      response_time_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS product_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product TEXT NOT NULL,
      cache_key TEXT NOT NULL,
      data_json TEXT NOT NULL,
      cached_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_key ON product_cache(product, cache_key)`,
    `CREATE INDEX IF NOT EXISTS idx_cache_expires ON product_cache(expires_at)`,
    `CREATE TABLE IF NOT EXISTS abandoned_402s (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      product TEXT NOT NULL,
      price_shown TEXT NOT NULL,
      agent_info TEXT,
      endpoint TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS health_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      product TEXT,
      source_name TEXT NOT NULL,
      status TEXT NOT NULL,
      response_time_ms INTEGER,
      error_message TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS data_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_checked TEXT,
      consecutive_failures INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ];

  for (const sql of stmts) {
    await env.DB.prepare(sql).run().catch(() => {});
  }
});
