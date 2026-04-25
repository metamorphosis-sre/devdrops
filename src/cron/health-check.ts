import type { Env, DataSource } from "../types";
import { createMimeMessage } from "mimetext";
import { EmailMessage } from "cloudflare:email";

const MAX_CONSECUTIVE_FAILURES = 3;
const ALERT_EMAIL = "pchawla@gmail.com";

export async function runHealthCheck(env: Env) {
  // 1. Check upstream data sources
  const sources = await env.DB.prepare(
    "SELECT * FROM data_sources WHERE is_active = 1"
  ).all<DataSource>();

  const failures: Array<{ product: string; source: string; error: string }> = [];
  const disabled: Array<{ product: string; source: string }> = [];

  if (sources.results.length) {
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
          status = "fail";
          errorMessage = `HTTP ${res.status}`;
        }
      } catch (e) {
        status = "fail";
        errorMessage = e instanceof Error ? e.message : "Unknown error";
      }

      const elapsed = Date.now() - start;

      await env.DB.prepare(
        `INSERT INTO health_log (product, source_name, status, response_time_ms, error_message)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(source.product, source.source_name, status, elapsed, errorMessage ?? null)
        .run();

      if (status === "fail") {
        const newFailures = source.consecutive_failures + 1;
        await env.DB.prepare(
          `UPDATE data_sources
           SET consecutive_failures = ?, last_checked = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`
        )
          .bind(newFailures, source.id)
          .run();

        failures.push({ product: source.product, source: source.source_name, error: errorMessage ?? "unknown" });

        if (newFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.error(
            `Health check: disabling ${source.source_name} for ${source.product} after ${newFailures} failures`
          );
          await env.DB.prepare(
            `UPDATE data_sources SET is_active = 0, updated_at = datetime('now') WHERE id = ?`
          )
            .bind(source.id)
            .run();

          await env.DB.prepare(
            `UPDATE data_sources
             SET is_active = 1, is_primary = 1, updated_at = datetime('now')
             WHERE product = ? AND id != ? AND is_active = 0
             LIMIT 1`
          )
            .bind(source.product, source.id)
            .run();

          disabled.push({ product: source.product, source: source.source_name });
        }
      } else {
        await env.DB.prepare(
          `UPDATE data_sources
           SET consecutive_failures = 0, last_checked = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`
        )
          .bind(source.id)
          .run();
      }
    }
  }

  // 2. Check core infrastructure (D1 + KV)
  let d1ok = true;
  let kvok = true;
  try {
    await env.DB.prepare("SELECT 1").first();
  } catch {
    d1ok = false;
  }
  try {
    await env.CACHE.get("health-ping");
  } catch {
    kvok = false;
  }

  // 3. Send alert email if anything is wrong
  const hasIssues = failures.length > 0 || !d1ok || !kvok;
  if (hasIssues) {
    try {
      const lines = [
        `DevDrops Health Alert — ${new Date().toISOString()}`,
        ``,
      ];

      if (!d1ok) lines.push(`CRITICAL: D1 database is DOWN`);
      if (!kvok) lines.push(`CRITICAL: KV cache is DOWN`);

      if (failures.length > 0) {
        lines.push(``, `Failing upstream sources (${failures.length}):`);
        for (const f of failures) {
          lines.push(`  - ${f.product}/${f.source}: ${f.error}`);
        }
      }

      if (disabled.length > 0) {
        lines.push(``, `AUTO-DISABLED (${MAX_CONSECUTIVE_FAILURES}+ consecutive failures):`);
        for (const d of disabled) {
          lines.push(`  - ${d.product}/${d.source}`);
        }
      }

      lines.push(``, `---`, `https://api.devdrops.run/health`);

      const msg = createMimeMessage();
      msg.setSender({ name: "DevDrops Alert", addr: "notifications@devdrops.run" });
      msg.setRecipient(ALERT_EMAIL);
      msg.setSubject(`[DevDrops] ${!d1ok || !kvok ? "CRITICAL" : "WARNING"}: ${failures.length} source(s) failing`);
      msg.addMessage({ contentType: "text/plain", data: lines.join("\n") });

      const email = new EmailMessage("notifications@devdrops.run", ALERT_EMAIL, msg.asRaw());
      await env.EMAIL.send(email);
      console.log("Health alert email sent");
    } catch (e) {
      console.error("Failed to send health alert email:", e);
    }
  }

  console.log(`Health check complete: ${sources.results.length} sources, ${failures.length} failures, infra: D1=${d1ok ? "ok" : "FAIL"} KV=${kvok ? "ok" : "FAIL"}`);
}
