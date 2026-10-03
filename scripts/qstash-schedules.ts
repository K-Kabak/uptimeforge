import "dotenv/config";
import { queue } from "../src/lib/queue";
import { appUrl } from "../src/lib/env";
if (!process.argv.includes("--apply")) {
  console.info(
    "Dry run: dispatcher every minute; cleanup daily 02:00 UTC. Pass --apply only when configuring an authorized environment.",
  );
} else {
  await queue().schedules.create({
    scheduleId: "uptimeforge-dispatch",
    destination: new URL("/api/internal/dispatch", appUrl()).href,
    cron: "* * * * *",
    body: "{}",
  });
  await queue().schedules.create({
    scheduleId: "uptimeforge-cleanup",
    destination: new URL("/api/internal/cleanup", appUrl()).href,
    cron: "0 2 * * *",
    body: "{}",
  });
}
