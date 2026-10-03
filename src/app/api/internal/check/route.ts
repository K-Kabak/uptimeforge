import { signedRoute, jobPayload } from "@/lib/queue";
import { runCheckJob } from "@/features/checks/jobs";
export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = (request: Request) =>
  signedRoute(request, "/api/internal/check", async (raw) => {
    const { jobId } = jobPayload.parse(JSON.parse(raw));
    const result = await runCheckJob(jobId);
    return { processed: true, result: result?.result ?? "NO_OP" };
  });
