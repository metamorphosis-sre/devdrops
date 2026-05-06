# DevDrops Backup Runbook

## Current Status

R2 backups are implemented but optional. Production `/health` reports:

- `checks.r2: not_configured`
- `backup.status: skipped`
- `backup.reason: R2 binding STORAGE is not configured; nightly backup cron exits without writing.`

This is a safe degraded state. D1/KV continue to operate.

## Enabling R2 Backups

Only enable when the R2 bucket exists and the Cloudflare binding is ready.

1. Create/verify R2 bucket: `devdrops-backups`.
2. Add the `STORAGE` binding in `wrangler.toml` and `wrangler.jsonc`.
3. Deploy.
4. Confirm `/health` reports `checks.r2: ok` and `backup.status: ready`.
5. Wait for the existing nightly cron or manually invoke a safe preview only if Cloudflare supports it.

## Backup Scope

The backup job exports:

- `transactions`
- `abandoned_402s`
- `health_log`
- `data_sources`
- `product_cache`

Retention: 90 days.

## Restore Posture

This repository does not include an automated destructive restore command. Any restore should be explicit, reviewed, and table-specific.

Do not drop, truncate, or overwrite production D1 tables without explicit approval.
