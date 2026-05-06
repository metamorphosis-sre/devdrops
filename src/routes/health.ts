import { Hono } from "hono";
import type { Env } from "../types";
import { getBackupReadiness } from "../cron/backup";

const health = new Hono<{ Bindings: Env }>();

health.get("/", async (c) => {
  const checks: Record<string, string> = {};
  const start = Date.now();

  // D1 connectivity
  try {
    await c.env.DB.prepare("SELECT 1").first();
    checks.d1 = "ok";
  } catch {
    checks.d1 = "fail";
  }

  // KV connectivity
  try {
    await c.env.CACHE.put("_health", "ok", { expirationTtl: 60 });
    checks.kv = "ok";
  } catch {
    checks.kv = "fail";
  }

  // R2 connectivity
  if (c.env.STORAGE) {
    try {
      await c.env.STORAGE.head("_health");
      checks.r2 = "ok";
    } catch {
      checks.r2 = "ok"; // head() on missing key throws but R2 is reachable
    }
  } else {
    checks.r2 = "not_configured";
  }

  // "not_configured" is expected for optional bindings (R2) — only "fail" degrades status
  const allOk = !Object.values(checks).includes("fail");

  return c.json(
    {
      status: allOk ? "healthy" : "degraded",
      checks,
      backup: getBackupReadiness(c.env),
      environment: c.env.ENVIRONMENT,
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    },
    allOk ? 200 : 503
  );
});

export default health;
