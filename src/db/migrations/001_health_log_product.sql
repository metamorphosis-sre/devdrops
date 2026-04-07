-- Migration 001: Add product column to health_log for per-product analytics
ALTER TABLE health_log ADD COLUMN product TEXT;
CREATE INDEX IF NOT EXISTS idx_health_product ON health_log(product);
