import type { Env } from "../types";
import { runHealthCheck } from "./health-check";
import { runBackup } from "./backup";
import { refreshSanctionsList } from "../routes/sanctions";

export async function handleScheduled(event: ScheduledEvent, env: Env) {
  switch (event.cron) {
    case "*/30 * * * *":
      try {
        await runHealthCheck(env);
      } catch (e) {
        console.error("Health check cron failed:", e);
      }
      break;
    case "0 2 * * *":
      try {
        await runBackup(env);
      } catch (e) {
        console.error("Backup cron failed:", e);
      }
      try {
        await refreshSanctionsList(env.CACHE);
      } catch (e) {
        console.error("Sanctions list refresh failed:", e);
      }
      break;
    default:
      console.log(`Unhandled cron trigger: ${event.cron}`);
  }
}
