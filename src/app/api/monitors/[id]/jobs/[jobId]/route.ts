import { privateRoute } from "@/lib/http";
import { ownedMonitor } from "@/features/monitors/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
export const GET = (
  request: Request,
  context: { params: Promise<{ id: string; jobId: string }> },
) =>
  privateRoute(request, async (userId) => {
    const { id, jobId } = await context.params;
    await ownedMonitor(userId, id);
    const job = await db().checkJob.findFirst({
      where: { id: jobId, monitorId: id },
      select: {
        id: true,
        status: true,
        check: { select: { result: true, durationMs: true, httpStatus: true } },
      },
    });
    if (!job) throw new AppError("JOB_NOT_FOUND", "Job not found", 404);
    return job;
  });
