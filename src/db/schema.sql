-- DevDrops D1 Schema
-- Run: npm run db:init (local) or npm run db:init:remote (production)

-- Paid transaction log
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  product TEXT NOT NULL,
  amount_usd TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('x402', 'mpp')),
  agent_wallet TEXT,
  endpoint TEXT NOT NULL,
  response_time_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_product ON transactions(product);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);

-- Abandoned 402 log (agent queried but didn't pay)
CREATE TABLE IF NOT EXISTS abandoned_402s (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  product TEXT NOT NULL,
  price_shown TEXT NOT NULL,
  agent_info TEXT,
  endpoint TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_abandoned_product ON abandoned_402s(product);
CREATE INDEX IF NOT EXISTS idx_abandoned_timestamp ON abandoned_402s(timestamp);

-- Health check log
CREATE TABLE IF NOT EXISTS health_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  source_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'fail')),
  response_time_ms INTEGER,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_health_source ON health_log(source_name);
CREATE INDEX IF NOT EXISTS idx_health_timestamp ON health_log(timestamp);

-- Upstream data source registry
CREATE TABLE IF NOT EXISTS data_sources (
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
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_unique ON data_sources(product, source_name);

-- Product data cache (generic key-value cache per product)
CREATE TABLE IF NOT EXISTS product_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  data_json TEXT NOT NULL,
  cached_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_key ON product_cache(product, cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON product_cache(expires_at);
