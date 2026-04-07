CREATE TABLE IF NOT EXISTS credit_balances (
  wallet TEXT PRIMARY KEY,
  balance REAL NOT NULL DEFAULT 0,
  total_purchased REAL NOT NULL DEFAULT 0,
  total_used REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage')),
  amount REAL NOT NULL,
  bundle TEXT,
  endpoint TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_wallet ON credit_transactions(wallet);
CREATE INDEX IF NOT EXISTS idx_credit_tx_created ON credit_transactions(created_at);
