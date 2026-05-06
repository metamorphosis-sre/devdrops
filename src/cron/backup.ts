import type { Env } from "../types";

const TABLES = ["transactions", "abandoned_402s", "health_log", "data_sources", "product_cache"];
const RETENTION_DAYS = 90;

export function getBackupReadiness(env: Env) {
  return {
    configured: Boolean(env.STORAGE),
    status: env.STORAGE ? "ready" : "skipped",
    reason: env.STORAGE ? null : "R2 binding STORAGE is not configured; nightly backup cron exits without writing.",
    retention_days: RETENTION_DAYS,
    tables: TABLES,
  };
}

export async function runBackup(env: Env) {
  const storage = env.STORAGE;
  if (!storage) {
    console.log(getBackupReadiness(env).reason);
    return;
  }

  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const prefix = `backups/${date}`;
  let totalRows = 0;

  for (const table of TABLES) {
    try {
      const result = await env.DB.prepare(`SELECT * FROM ${table}`).all();
      const json = JSON.stringify(result.results, null, 2);

      await storage.put(`${prefix}/${table}.json`, json, {
        httpMetadata: { contentType: "application/json" },
        customMetadata: {
          table,
          rowCount: String(result.results.length),
          exportedAt: new Date().toISOString(),
        },
      });

      totalRows += result.results.length;
      console.log(`Backup: ${table} — ${result.results.length} rows`);
    } catch (e) {
      console.error(`Backup failed for ${table}:`, e);
    }
  }

  // Clean up old backups beyond retention period
  await cleanOldBackups(storage);

  console.log(`Backup complete: ${TABLES.length} tables, ${totalRows} total rows → R2 ${prefix}/`);
}

async function cleanOldBackups(storage: R2Bucket) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const listed = await storage.list({ prefix: "backups/" });

  for (const obj of listed.objects) {
    // Extract date from path: backups/2026-01-15/transactions.json
    const datePart = obj.key.split("/")[1];
    if (datePart && datePart < cutoffStr) {
      await storage.delete(obj.key);
    }
  }
}
