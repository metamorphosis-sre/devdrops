import type { Env, DataSource } from "../types";

const MAX_CONSECUTIVE_FAILURES = 3;

export async function runHealthCheck(env: Env) {
  const sources = await env.DB.prepare(
    "SELECT * FROM data_sources WHERE is_active = 1"
  ).all<DataSource>();

  if (!sources.results.length) {
    console.log("Health check: no active data sources registered");
    return;
  }

  for (const source of sources.results) {
    const start = Date.now();
    let status: "ok" | "fail" = "ok";
    let errorMessage: string | undefined;

    try {
      const res = await fetch(source.source_url, {
        method: "HEAD",
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok && res.status !== 405) {
        // 405 is fine — some APIs don't support HEAD
        status = "fail";
        errorMessage = `HTTP ${res.status}`;
      }
    } catch (e) {
      status = "fail";
      errorMessage = e instanceof Error ? e.message : "Unknown error";
    }

    const elapsed = Date.now() - start;

    // Log health check result
    await env.DB.prepare(
      `INSERT INTO health_log (product, source_name, status, response_time_ms, error_message)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(source.product, source.source_name, status, elapsed, errorMessage ?? null)
      .run();

    // Update source tracking
    if (status === "fail") {
      const newFailures = source.consecutive_failures + 1;
      await env.DB.prepare(
        `UPDATE data_sources
         SET consecutive_failures = ?, last_checked = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`
      )
        .bind(newFailures, source.id)
        .run();

      // Auto-disable after MAX_CONSECUTIVE_FAILURES and try to activate backup
      if (newFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(
          `Health check: disabling ${source.source_name} for ${source.product} after ${newFailures} failures`
        );
        await env.DB.prepare(
          `UPDATE data_sources SET is_active = 0, updated_at = datetime('now') WHERE id = ?`
        )
          .bind(source.id)
          .run();

        // Activate backup source for this product
        await env.DB.prepare(
          `UPDATE data_sources
           SET is_active = 1, is_primary = 1, updated_at = datetime('now')
           WHERE product = ? AND id != ? AND is_active = 0
           LIMIT 1`
        )
          .bind(source.product, source.id)
          .run();
      }
    } else {
      // Reset failure counter on success
      await env.DB.prepare(
        `UPDATE data_sources
         SET consecutive_failures = 0, last_checked = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`
      )
        .bind(source.id)
        .run();
    }
  }

  console.log(`Health check complete: checked ${sources.results.length} sources`);
}
