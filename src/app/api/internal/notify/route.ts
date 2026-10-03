import { signedRoute, jobPayload } from "@/lib/queue";
import { deliverNotification } from "@/features/notifications/service";
export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = (request: Request) =>
  signedRoute(request, "/api/internal/notify", (raw) =>
    deliverNotification(jobPayload.parse(JSON.parse(raw)).jobId),
  );
