import "dotenv/config";
import { db } from "../src/lib/db";
import { reserveDue } from "../src/server/dispatcher";
import { runCheckJob } from "../src/features/checks/jobs";
if (process.env.NODE_ENV === "production")
  throw new Error("Development runner is disabled in production");
const jobs = await reserveDue();
for (const job of jobs) await runCheckJob(job.id);
await db().$disconnect();
