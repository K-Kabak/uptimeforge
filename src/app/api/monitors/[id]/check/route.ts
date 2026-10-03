import { privateRoute } from "@/lib/http";
import { ownedMonitor } from "@/features/monitors/service";
import { reserveManualJob } from "@/features/checks/jobs";
import { relayChecks } from "@/server/dispatcher";
import { rateLimit } from "@/lib/redis";
import { AppError } from "@/lib/errors";
export const runtime = "nodejs";
export const POST = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) =>
  privateRoute(
    request,
    async (userId) => {
      const monitor = await ownedMonitor(userId, (await context.params).id);
      if (monitor.status === "PAUSED")
        throw new AppError(
          "MONITOR_PAUSED",
          "Resume the monitor before checking",
        );
      await rateLimit(`manual:${monitor.id}`, 1, 30000);
      const job = await reserveManualJob(userId, monitor.id);
      await relayChecks();
      return { jobId: job.id };
    },
    20,
    202,
  );
