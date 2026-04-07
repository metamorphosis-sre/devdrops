import type { Env } from "../types";
import { runHealthCheck } from "./health-check";
import { runBackup } from "./backup";
import { refreshSanctionsList } from "../routes/sanctions";

export async function handleScheduled(event: ScheduledEvent, env: Env) {
  switch (event.cron) {
    case "*/30 * * * *":
      await runHealthCheck(env);
      break;
    case "0 2 * * *":
      await runBackup(env);
      // Also refresh sanctions list nightly
      await refreshSanctionsList(env.CACHE).catch((e) =>
        console.error("Sanctions list refresh failed:", e)
      );
      break;
    default:
      console.log(`Unhandled cron trigger: ${event.cron}`);
  }
}
