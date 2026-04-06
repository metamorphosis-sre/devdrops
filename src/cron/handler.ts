import type { Env } from "../types";
import { runHealthCheck } from "./health-check";
import { runBackup } from "./backup";

export async function handleScheduled(event: ScheduledEvent, env: Env) {
  switch (event.cron) {
    case "*/30 * * * *":
      await runHealthCheck(env);
      break;
    case "0 2 * * *":
      await runBackup(env);
      break;
    default:
      console.log(`Unhandled cron trigger: ${event.cron}`);
  }
}
